import React from "react";
import CalendarButtons from "../components/calendar/CalendarButtons";
import CalendarContainer from "../components/calendar/CalendarContainer";

const Results = () => {
    return(
        <div className="h-screen min-h-full max-h-[1080px] text-center py-[70px]">
            <div className="w-full h-full flex justify-center">
                <CalendarButtons/>
                <CalendarContainer />
            </div>
        </div>
    )
}

export default Results;