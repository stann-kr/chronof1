import React from "react"
import ScheduleCard from "./ScheduleCard";

export interface IRackingData {
    rank: number;
    name: string;
    time: string;
}

export interface ScheduleCardProps {
    round: string; // 라운드
    country: string; // 나라
    date: string; // 날짜
    raceName: string;
    status: string; // 경기 상태 ( 1. SOON, 2. LIVE, 3. REPLAY, 4. REPLAY(NONE))
    rankings: IRackingData[]; // 경기 랭킹
}

const cardData: ScheduleCardProps[] = [
    {
      round: "round 1",
      country: "germany",
      date: "11 - 13 oct",
      raceName: "FORMULA 1 UNITED STATE OF AMERICA GRAND PRIX 2025",
      status: 'live',
      rankings: [
        { rank: 1, name: "이혜린", time: "1:33:4.675" },
        { rank: 2, name: "홍길동", time: "1:34:0.123" },
        { rank: 3, name: "김철수", time: "1:35:2.456" },
      ],
    },
    {
        round: "round 2",
        country: "germany",
        date: "11 - 13 oct",
        raceName: "FORMULA 1 UNITED STATE OF AMERICA GRAND PRIX 2025",
        status: 'soon',
        rankings: [
          { rank: 1, name: "이혜린", time: "1:33:4.675" },
          { rank: 2, name: "홍길동", time: "1:34:0.123" },
          { rank: 3, name: "김철수", time: "1:35:2.456" },
        ],
      },
      {
        round: "round 3",
        country: "korea",
        date: "11 - 13 oct",
        raceName: "FORMULA 1 UNITED STATE OF AMERICA GRAND PRIX 2025",
        status: 'replay',
        rankings: [
          { rank: 1, name: "이혜린", time: "1:33:4.675" },
          { rank: 2, name: "홍길동", time: "1:34:0.123" },
          { rank: 3, name: "김철수", time: "1:35:2.456" },
        ],
      },
      
      
  ];

const ScheduleCardList = () => {
    return(
        <div className="grid grid-cols-3 gap-5 w-full h-[95%] overflow-y-auto pb-[100px] pr-3">
            {cardData.map((props, idx) => (
                <ScheduleCard key={idx} {...props} />
            ))}
        </div>
    )
}

export default ScheduleCardList;