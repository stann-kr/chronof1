import React, { useEffect, useRef, useState } from "react";
import ResultsTable from "../results/ResultsTable";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ScheduleCardList from "../schedules/ScheduleCardList";
import { useYearStore } from "../../hooks/stores/useYaerStore";

type TTabList = {
    tabs: string[];
    tabClass?: string;
    year?: string;
    onTabClick?:  (tab: string) => void;
    activeTab?: string;
}

const TabList = ({tabs, tabClass, year, onTabClick, activeTab}: TTabList) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleTabClick = (tab: string) => {
        if (onTabClick) onTabClick(tab);
        const lowerTab = tab.toLowerCase();
        let targetPath = `/${lowerTab}/${year}`;
        if(lowerTab === 'results') {
            targetPath += '/race';
        }
        navigate(targetPath);
    };

    return (
    <ul className={`flex ${tabClass}`}>
        {   tabs.map((tab) => (
                <li className="mr-5" key={tab}>
                    <button
                        className={`!bg-transparent ${(activeTab === tab && location.pathname.includes(tab.toLowerCase())) ? '!font-bold !text-red-400' : ''}`}
                        onClick={() => handleTabClick(tab)}
                    >
                        {tab}
                    </button>
                </li>
            ))
        }
    </ul>
)}

type TSelectBox = {
    options: string[];
}

const SelectBox = ({options} :TSelectBox) => {
    const [selected, setSelected] = useState("All");
    const hiddenRef = useRef<HTMLSpanElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        if (hiddenRef.current && selectRef.current) {
          const width = hiddenRef.current.offsetWidth + 40; // padding 고려
          selectRef.current.style.width = `${width}px`;
        }
      }, [selected]);

      return (
        <form className="mr-5 border rounded-3xl">
            <span
                ref={hiddenRef}
                className="invisible absolute whitespace-nowrap px-2 text-base"
            >
                {selected}
            </span>
            <select 
                ref={selectRef}
                className="w-auto pl-3 mr-3 py-3 focus:outline-none focus:border-none" 
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
            >
                <option value="all" selected>All</option>
                {
                    options.map((option) => (
                        <option key={option} className="!text-red" value={option} >{option}</option>
                    ))
                }
            </select>
        </form>
      )
    };

    const Title = () => {
        const year = useYearStore((state) => state.selectedYear);
        
        return(
            <h3 className="text-[28px] font-bold pb-5 uppercase">
                {year} : FIA FORMULA 1 CHAMPIONSHIP
            </h3>
        )
    }
    

const CalendarContainer = () => {
    const { year } = useParams();
    const [activeMainTab, setActiveMainTab] = useState('Schedule');
    const location = useLocation();
    // 탭 정보 
    const tableMainTabs = ['Schedule', 'Results'];
    const tableSubTabs = ['Races', 'Drivers', 'Teams']

    // TODO ::  select option api 연동 시 데이터 받아와야 함
    const selectOptions1 = ['Australia', 'China', 'Japan', 'Bahrain', 'Saudi Arabia', 'Miami'];
    const selectOptions2 = ['Practice 1', 'Sprint Grid', 'Sprint', 'Pit Stop Summary', 'Fastest Laps'];


    

    return(
        <div className="w-[80%] min-w-[1280px] ml-10 overflow-hidden pb-[100px]">
             <div className="flex flex-col items-center mb-2">
                <Title />

                <div className="flex mb-2 w-full">
                    <TabList tabs={tableMainTabs} year={year} onTabClick={setActiveMainTab} activeTab={activeMainTab} />
                    {activeMainTab === 'Results' && (
                        <TabList tabs={tableSubTabs} tabClass='ml-auto'/>
                    )}
                </div>
            </div>
            {
                location.pathname.includes('results') ? 
                <h3 className="mt-50">준비중입니다.</h3>
                : <ScheduleCardList />
            } 
        </div>
    )
}

export default CalendarContainer;