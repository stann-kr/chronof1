import React, { useState } from "react";
import { FaPlay, FaPause, FaStop, FaStepForward, FaStepBackward } from 'react-icons/fa';
import TimingTable from "./TimingTable";

enum speedType {
  NOMAL =1,
  TWO_SPEED
}

// 재생/일시정지 토글 버튼
const PlayPauseButton = ({ isPlaying, onClick }) => (
  <button 
    onClick={onClick}
    className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
  >
    {isPlaying ? (
      <FaPause className="text-white text-lg" />
    ) : (
      <FaPlay className="text-white text-lg ml-1" />
    )}
  </button>
);

// 정지 버튼
const StopButton = ({ onClick }) => (
  <button 
    onClick={onClick}
    className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
  >
    <FaStop className="text-white text-lg" />
  </button>
);

// 앞으로/뒤로 버튼
const SkipButtons = ({ onForward, onBackward }) => (
  <div className="flex gap-2">
    <button 
      onClick={onBackward}
      className="w-10 h-10 bg-gray-500 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
    >
      <FaStepBackward className="text-white text-sm" />
    </button>
    <button 
      onClick={onForward}
      className="w-10 h-10 bg-gray-500 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
    >
      <FaStepForward className="text-white text-sm" />
    </button>
  </div>
);

const LiveTimingComponent = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(speedType.NOMAL);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  const changeSpeed = () => {
    setSpeed(speed === speedType.NOMAL ? speedType.TWO_SPEED : speedType.NOMAL);
  }

  return(
    <div className="w-full min-w-[800px]">
      <div>
        <div className="flex items-center">
          <div className="w-[65px] h-[45px] rounded-2xl">
            <img src="src/assets/bel.svg" className="w-full h-full rounded-[10px]"/>
          </div>

          <div className="flex flex-col text-left ml-5">
            <span className="font-bold">British Grand Prix: Race</span>
            <span className="font-extrabold">00:00:00</span>
          </div>

          <div className="border border-[#606060] my-auto h-10 ml-5"></div>

          <div className="flex items-center p-4">
            <button className="!bg-transparent w-[55px] ma-auto flex justify-center items-center">
              <FaStepBackward className="text-white text-sm" />
            </button>
            <button 
              onClick={handlePlayPause}
              className="!bg-transparent w-[55px] ma-auto flex justify-center items-center"
            >
              {isPlaying ? (
                <FaPause className="text-white text-lg" />
              ) : (
                <FaPlay className="text-white text-lg" />
              )}
            </button>
            <button className="!bg-transparent w-[55px] ma-auto flex justify-center items-center">
              <FaStepForward className="text-white text-sm" />
            </button>
            <button 
              onClick={changeSpeed}
              className="w-[35px] h-[25px] flex justify-center items-center !bg-blue-700">
              <span className="font-bold">x{speed}</span>
            </button>
          </div>
        </div>
        <input type="range" className="w-full h-[10px] accent-[#C4FF65]"/>
      </div>

      <TimingTable />
     
    </div>
  )
}

export default LiveTimingComponent;