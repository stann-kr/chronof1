import React from "react";
import CalendarButtons from "../components/common/YearsButtons";
import CalendarContainer from "../components/common/RightDataComponent";

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