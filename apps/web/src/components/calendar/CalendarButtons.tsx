import React, { useState } from "react";

type TYearButton = {
    year: number;
}

interface Decade {
    startYear: number;
    endYear: number;
    years: number[];
  }

const getYears = (): number[] => {
    const currentYear = new Date().getFullYear();
    return  Array.from({ length: currentYear - 1980 + 1 }, (_, i) => 1980 + i);
}

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

const DecadeSelector = ({ decades, onDecadeSelect }: { decades: Decade[], onDecadeSelect: (decade: Decade) => void }) => (
    <li>
      {decades.map((decade) => (
        <button key={`${decade.startYear}-${decade.endYear}`} onClick={() => onDecadeSelect(decade)}>
          {decade.startYear}
        </button>
      ))}
    </li>
  );

const YearSelector = ({ years, onYearSelect }: { years: number[], onYearSelect: (year: number) => void }) => (
    <li>
      {years.map((year) => (
        <button key={year} onClick={() => onYearSelect(year)}>
          {year}
        </button>
      ))}
    </li>
  );

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

      const backDecadeSelect = () => {
        setSelectedYear(null);
        setSelectedDecade(null);
      }

    return(
        <ul className="grid">
            {selectedDecade ? (
                <>
                    <BackButton onBack={backDecadeSelect}/>
                    <YearSelector years={selectedDecade.years} onYearSelect={handleYearSelect} />
                </>
            
            ):
                <DecadeSelector decades={decades} onDecadeSelect={handleDecadeSelect} />
            }
        </ul>
    )
}

export default CalendarButtons;