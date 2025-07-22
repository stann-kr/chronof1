import React, { useEffect, useRef, useState } from "react";

type TTabList = {
    tabs: string[];
    tabClass?: string;
}

const TabList = ({tabs, tabClass}: TTabList) => (
    <ul className={`flex ${tabClass}`}>
        {
            tabs.map((tab) => (
                <li className="mr-5" key={tab}>
                    <button className="!bg-transparent !font-bold">{tab}</button>
                </li>
            ))
        }
    </ul>
)

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

const CalendarContainer = () => {
    // 탭 정보 
    const tableMainTabs = ['Schedule', 'Results'];
    const tableSubTabs = ['Races', 'Drivers', 'Teams']

    // TODO :: 추후 데이터 연동 시 동적으로 생성
    const rowData = ['grand prx', 'date', 'winner', 'team', 'laps', 'time'];

    // TODO ::  select option api 연동 시 데이터 받아와야 함
    const selectOptions1 = ['Australia', 'China', 'Japan', 'Bahrain', 'Saudi Arabia', 'Miami'];
    const selectOptions2 = ['Practice 1', 'Sprint Grid', 'Sprint', 'Pit Stop Summary', 'Fastest Laps'];

    return(
        <div className="col-span-3 h-[680px]">
            <div className="flex flex-col items-start mb-5">
                <div className="flex mb-5 w-full">
                    <TabList tabs={tableMainTabs} />
                    <TabList tabs={tableSubTabs} tabClass='ml-auto'/>
                </div>

                <div className="flex">
                    <SelectBox options={selectOptions1} />
                    <SelectBox options={selectOptions2} />
                </div>
            </div>
            

            <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-black">
                    <tr>
                        {
                            rowData.map((data) => (
                                <th key={data} className="px-6 py-3 text-left uppercase">{data}</th>
                            ))
                        }
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>먀먀</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

export default CalendarContainer;