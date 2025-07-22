import React, { useEffect, useState } from "react";
import { useYearStore } from "../../hooks/stores/useYaerStore";
import { CURRENT_YEAR, getDecades, getYearsOfSelectedDecade, IDecade, INITIAL_YEAR } from "../../utils/getDecadeRange";

type SelectableListProps<T> = {
  items: T[];
  selectedItem?:  number | null;
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string | number;
  onSelect: (item: T) => void;
};

const SelectableList = <T,>({
  items,
  selectedItem,
  getKey,
  getLabel,
  onSelect,
}: SelectableListProps<T>) => (
  <ul>
    {items.map((item) => (
      <li key={getKey(item)}>
        <button 
          className={`w-full h-[45px] mb-3 focus:!outline-none focus:!border-none 
            ${selectedItem === getKey(item) && '!bg-red-500 !font-bold'}`} 
          onClick={() => onSelect(item)}>
          {getLabel(item)}
        </button>
      </li>
    ))}
  </ul>
);

// 뒤로가기 버튼
const BackButton = ({onBack}: { onBack: () => void }) => (
  <button className="w-full mb-3" onClick={() => onBack()}>
    <span className="font-bold">Back</span>
  </button>
)


const CalendarButtons = () => {
  const [years, setYears] = useState<number[]>([]);
  const decades = getDecades(INITIAL_YEAR, CURRENT_YEAR);  // 10년 단위로 그룹화
  const { selectedDecade, selectedYear, setDecade, setYear } = useYearStore();

  const handleDecadeSelect = (decade: IDecade) => {
      setDecade(decade);
      setYears(getYearsOfSelectedDecade(decade.startYear, decade.endYear));
    };

    const handleYearSelect = (year: number) => {
      setYear(year);
    };

    const resetSelection = () => {
      setYears([]);
      setDecade( {startYear: 0, endYear: 0})
    }
    
    useEffect(() => {
      setYears( getYearsOfSelectedDecade(selectedDecade.startYear, selectedDecade.endYear));
    }, [])

    return(
      <div className="max-w-xs">
        {selectedDecade.startYear !== 0 ? (
          <>
            <BackButton onBack={resetSelection} />
            <SelectableList
              items={years}
              selectedItem={selectedYear}
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