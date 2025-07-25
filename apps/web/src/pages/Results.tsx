import React from "react";
import CalendarButtons from "../components/calendar/CalendarButtons";
import CalendarContainer from "../components/calendar/CalendarContainer";

const Results = () => {
    return(
        <div className="text-center">
            <div className="w-full flex justify-center text-center">
                <CalendarButtons/>
                <CalendarContainer />
            </div>
        </div>
    )
}

export default Results;