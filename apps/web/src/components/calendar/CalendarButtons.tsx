import React, { useEffect, useState } from "react";
import { useYearStore } from "../../hooks/stores/useYaerStore";
import { CURRENT_YEAR, getDecades, getYearsOfSelectedDecade, IDecade, INITIAL_YEAR } from "../../utils/getDecadeRange";
import { useLocation, useNavigate, useParams } from "react-router-dom";

type SelectableListProps<T> = {
  items: T[];
  selectedKey:  number | string;
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string | number;
  onSelect: (item: T) => void;
};

const SelectableList = <T,>({
  items,
  selectedKey,
  getKey,
  getLabel,
  onSelect,
}: SelectableListProps<T>) => (
  <ul>
    {items.map((item) => (
      <li key={getKey(item)}>
        <button 
          className={`w-full h-[45px] mb-3 focus:!outline-none focus:!border-none 
            ${selectedKey === getKey(item) && '!bg-red-500 !font-bold'}`} 
          onClick={() => onSelect(item)}>
          {getLabel(item)}
        </button>
      </li>
    ))}
  </ul>
);

// 뒤로가기 버튼
const BackButton = ({onBack}: { onBack: () => void }) => (
  <button className="w-full mb-3 !bg-[#2C3A47]" onClick={() => onBack()}>
    <span className="font-bold">Back</span>
  </button>
)


const CalendarButtons = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'decade' | 'year'>('year');
  const decades = getDecades(INITIAL_YEAR, CURRENT_YEAR);  // 10년 단위로 그룹화
  const { selectedDecade, selectedYear, setDecade, setYear } = useYearStore();
  const [nowDecade, setNowDecade] = useState<IDecade>(selectedDecade);

  const years = getYearsOfSelectedDecade(nowDecade.startYear, nowDecade.endYear);

    const handleDecadeSelect = (decade: IDecade) => {
      setNowDecade(decade)
      setMode('year');
    };

    const handleYearSelect = (year: number) => {
      setYear(year);
      setDecade(nowDecade);
      const pathList = location.pathname.slice(1).split('/');
      const url = `/${pathList[0]}/${year}${pathList.length > 2 ? '/' + pathList[2] : '' }`
      navigate(url)
    };

    const resetSelection = () => {
      setNowDecade(selectedDecade);
      setMode('decade');
      console.log(decades);
    }


    return(
      <div className="max-w-[200px] min-w-[150px] mt-19 max-h-[640px] overflow-auto">
        {mode === 'year' ? (
          <>
            <BackButton onBack={resetSelection} />
            <SelectableList
              items={years}
              selectedKey={selectedYear}
              getKey={(year) => year}
              getLabel={(year) => year}
              onSelect={handleYearSelect}
            />
          </>
        ) : (
          <SelectableList
            items={decades}
            selectedKey={`${nowDecade.startYear}-${nowDecade.endYear}`}
            getKey={(decade) => `${decade.startYear}-${decade.endYear}`}
            getLabel={(decade) => `${decade.startYear}s`}
            onSelect={handleDecadeSelect}
          />
        )}
    </div>
    )
}

export default CalendarButtons;