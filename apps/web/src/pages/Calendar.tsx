import React from "react";
import CalendarButtons from "../components/calendar/CalendarButtons";
import CalendarContainer from "../components/calendar/CalendarContainer";

const Calendar = () => {
    return(
        <div className=" grid grid-flow-col grid-cols-3 grid-rows-1 text-center">
            <CalendarButtons/>
            <CalendarContainer />
        </div>
    )
}

export default Calendar;