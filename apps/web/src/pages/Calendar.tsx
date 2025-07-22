import React from "react";
import CalendarButtons from "../components/calendar/CalendarButtons";
import CalendarContainer from "../components/calendar/CalendarContainer";
import { useYearStore } from "../hooks/stores/useYaerStore";

const Title = () => {
    const year = useYearStore((state) => state.selectedYear);
    
    return(
        <h3 className="text-[38px] font-bold pb-8 uppercase">
            {year} : FIA FORMULA 1 CHAMPIONSHIP
        </h3>
    )
}


const Calendar = () => {
    return(
        <div className="flex flex-col justify-center text-center">
            <Title />
            <div className="grid grid-flow-col grid-cols-4 grid-rows-1 text-center">
                <CalendarButtons/>
                <CalendarContainer />
            </div>
        </div>
    )
}

export default Calendar;