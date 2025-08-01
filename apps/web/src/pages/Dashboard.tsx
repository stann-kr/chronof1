import React from "react";
import LiveTimingComponent from "../components/dashboard/LiveTimingComponent";
import RaceInfoComponent from "../components/dashboard/RaceInfoComponent";

const Dashboard = () => {
    return(
        <div className="w-full h-screen min-h-full max-h-[1080px] py-[70px] flex justify-center">
            <LiveTimingComponent />
            <RaceInfoComponent />
        </div>
    )
}

export default Dashboard;