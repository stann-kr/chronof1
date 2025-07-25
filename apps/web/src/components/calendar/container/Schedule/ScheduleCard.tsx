import React from "react";
import { IRackingData, ScheduleCardProps } from "./ScheduleCardList";

const ScheduleCard = ({
    round,
    country,
    date,
    raceName,
    status,
    rankings,
  } :ScheduleCardProps) => {

    const Ranking = ({rank, name, time} : IRackingData) => (
        <div className="bg-[#2c2c2c]/70 rounded-xl flex items-center px-2" key={name}>
            <div className="font-black">
                <span>{rank}<span className="text-xs">st</span></span>
            </div>
            <div className="ml-2 text-left text-[12px] min-h-[40px] flex flex-col justify-center ">
                <span className="inline align-middle" style={{ lineHeight: '12px' }}>{name}</span>
                <span className="inline align-middle mt-0.5" style={{ lineHeight: '12px' }}>{time}</span>
            </div>
        </div>
    )


    return(
        <div 
            className="
                w-full
                h-full
                min-w-[380px]
                min-h-[380px] 
                max-h-[380px]
                bg-[url(/src/assets/race_image.png)] bg-no-repeat bg-cover bg-bottom
                rounded-md
                p-3 
                relative
                uppercase
                cursor-pointer
                ">

            <div className="w-full h-full absolute top-0 right-0 left-0 rounded-md bg-linear-to-t from-black to-white-500 to-100%"></div>
            
            <div className="w-full h-full absolute top-0 left-0 right-0 p-3 flex flex-col justify-between ">
                <div className="flex justify-between ">
                    <div className="text-left font-bold">
                        <span className="text-sm">{round}</span>
                        <p className="text-xl">{country}</p>
                    </div>

                    <div>
                        <span className="font-black text-red-500">{status}</span>
                    </div>
                </div>

                <div>
                    <div className="text-right font-bold">
                        <span>
                            {date}
                        </span>
                        <p style={{ lineHeight: '20px' }}>{raceName}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                        {
                            rankings.map((data) => (
                                <Ranking  rank={data.rank} name={data.name} time={data.time}/>
                            ))
                        }
                    </div>
                </div>
            </div>
            
        </div>
    )
}

export default ScheduleCard;