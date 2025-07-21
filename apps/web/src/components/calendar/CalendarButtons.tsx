import React, { useState } from "react";

type SelectableListProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string | number;
  onSelect: (item: T) => void;
};

interface Decade {
  startYear: number;
  endYear: number;
  years: number[];
}

// 선택 범위 년도 전체 ( 1991, 1992, ... , 1999 )
const getYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  return  Array.from({ length: currentYear - 1980 + 1 }, (_, i) => 1980 + i);
}

// 년도 범위 ( 1990s, 2000s ... etc)
const groupYearsIntoDecades = (years: number[]): Decade[] => {
  const decades: Decade[] = [];
  for (let i = 0; i < years.length; i += 10) {
      const decadeRange = years.slice(i, i + 10);
      const startYear = decadeRange[0];
      const endYear = decadeRange[decadeRange.length - 1];
      decades.push({ startYear, endYear, years: decadeRange });
    }
    return decades;
}

// year buttons
const SelectableList = <T,>({
  items,
  getKey,
  getLabel,
  onSelect,
}: SelectableListProps<T>) => (
  <ul>
    {items.map((item) => (
      <li key={getKey(item)}>
        <button className="w-full mb-3" onClick={() => onSelect(item)}>
          {getLabel(item)}
        </button>
      </li>
    ))}
  </ul>
);

// 뒤로가기 버튼
const BackButton = ({onBack}: { onBack: () => void }) => (
  <button onClick={() => onBack()}>뒤로가기</button>
)


const CalendarButtons = () => {
    const years = getYears();  // 1980년부터 현재까지 연도 목록 생성
    const decades = groupYearsIntoDecades(years);  // 10년 단위로 그룹화

    const [selectedDecade, setSelectedDecade] = useState<Decade | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);

    const handleDecadeSelect = (decade: Decade) => {
        setSelectedDecade(decade);
      };

      const handleYearSelect = (year: number) => {
        setSelectedYear(year);
      };

      const resetSelection = () => {
        setSelectedYear(null);
        setSelectedDecade(null);
      }

    return(
      <div>
      {selectedDecade ? (
        <>
          <BackButton onBack={resetSelection} />
          <SelectableList
            items={selectedDecade.years}
            getKey={(year) => year}
            getLabel={(year) => year}
            onSelect={handleYearSelect}
          />
        </>
      ) : (
        <SelectableList
          items={decades}
          getKey={(decade) => `${decade.startYear}-${decade.endYear}`}
          getLabel={(decade) => `${decade.startYear}s`}
          onSelect={handleDecadeSelect}
        />
      )}
    </div>
    )
}

export default CalendarButtons;