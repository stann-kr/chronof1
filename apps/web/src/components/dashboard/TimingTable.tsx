import React from "react"

// Types
interface DriverData {
  position: number
  driverCode: string
  positionChange: number
  status: string
  compound: string
  lap: number
  pitCount: number
  lastLapTime: string
  lastLapTimeFormatted: string
  gap: string
  gapFormatted: string
  sector1Time: string
  sector1TimeFormatted: string
  sector2Time: string
  sector2TimeFormatted: string
  sector3Time: string
  sector3TimeFormatted: string
}

interface TimingTableProps {
  data?: DriverData[]
  className?: string
}



// TODO ::  중복임 얘도 바꿀 수 있을 것 같음
const getPositionChangeColor = (change: number) => {
  if (change > 0) return 'text-green-500'
  if (change < 0) return 'text-red-500'
  return 'text-gray-500'
}

const getPositionChangeText = (change: number) => {
  if (change > 0) return `+${change}`
  if (change < 0) return change.toString()
  return '-'
}

///////////////////////////////////////////////


const formatTimeDisplay = (time: string, formattedTime: string, isBest = false) => (
  <div className="flex justify-baseline items-baseline font-bold">
    <span className="text-[18px]" style={{ lineHeight: '20px' }}>{time}</span>
    <span className={`text-[14px] ml-1 ${isBest ? 'text-purple-500' : 'text-gray-500'}`} style={{ lineHeight: '20px' }}>
      {formattedTime}
    </span>
  </div>
)

// Reusable Cell Components
const BaseCell: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  padding?: 'px-3' | 'pr-3' | 'none';
}> = ({ children, className = "", padding = "px-3" }) => (
  <td className={`${padding} ${className}`}>
    {children}
  </td>
)

// Specific Cell Components
const PositionCell: React.FC<{ data: DriverData }> = ({ data }) => (
  <BaseCell>
    <div className="flex items-center mx-auto">
      <span className="text-2xl">{data.position}</span>

      <div className="h-[25px] w-[5px] rounded-2xl mx-3 bg-amber-600"></div>
    
      <div className="flex text-center justify-center items-center">
        <p className="uppercase font-bold min-w-[36px]">{data.driverCode}</p>
        <span className={`text-[14px] ml-1 ${getPositionChangeColor(data.positionChange)}`}>
          {getPositionChangeText(data.positionChange)}
        </span>
      </div>
    </div>
  </BaseCell>
)

const StatusCell: React.FC<{ status: string }> = ({ status }) => (
  <BaseCell>
    <div className="w-[50px] border-2 rounded-md flex justify-center items-center font-bold">
      <span className="uppercase">{status}</span>
    </div>
  </BaseCell>
)

const TypeCell: React.FC<{ compound: string; lap: number; pitCount: number }> = ({ compound, lap, pitCount }) => (
  <BaseCell>
    <div className="flex justify-evenly items-center mx-auto">
      <span className="uppercase font-bold mr-3">{compound}</span>
      <div className="uppercase">
        <div className="text-[20px]" style={{ lineHeight: '20px' }}>
          <span>l</span>
          <span className="ml-3">{lap}</span>
        </div>
        <div className="text-[14px]" style={{ lineHeight: '12px' }}>
          <span>pit</span>
          <span>{pitCount}</span>
        </div>
      </div>
    </div>
  </BaseCell>
)

const TimeCell: React.FC<{ 
  lastLapTime: string; 
  lastLapTimeFormatted: string; 
  gap: string; 
  gapFormatted: string 
}> = ({ lastLapTime, lastLapTimeFormatted, gap, gapFormatted }) => (
  <BaseCell padding="none">
    <div className="flex font-bold">
      <div className="flex flex-col items-start">
        <span className="text-[18px]" style={{ lineHeight: '20px' }}>{lastLapTime}</span>
        <span className="text-[14px] text-gray-500" style={{ lineHeight: '16px' }}>{lastLapTimeFormatted}</span>
      </div>
      <div className="flex flex-col items-start ml-3">
        <span className="text-[14px]" style={{ lineHeight: '20px' }}>{gap}</span>
        <span className="text-[12px] text-gray-500" style={{ lineHeight: '16px' }}>{gapFormatted}</span>
      </div>
    </div>
  </BaseCell>
)

const SectorCell: React.FC<{ 
  time: string; 
  formattedTime: string; 
  isBest?: boolean;
  padding?: 'px-3' | 'pr-3';
}> = ({ time, formattedTime, isBest = false, padding = "pr-3" }) => (
  <BaseCell padding={padding}>
    {formatTimeDisplay(time, formattedTime, isBest)}
  </BaseCell>
)

// Row Component
const TimingRow: React.FC<{ data: DriverData }> = ({ data }) => (
  <tr className="h-[45px]">
    <PositionCell data={data} />
    <StatusCell status={data.status} />
    <TypeCell compound={data.compound} lap={data.lap} pitCount={data.pitCount} />
    <TimeCell 
      lastLapTime={data.lastLapTime}
      lastLapTimeFormatted={data.lastLapTimeFormatted}
      gap={data.gap}
      gapFormatted={data.gapFormatted}
    />
    <SectorCell 
      time={data.sector1Time}
      formattedTime={data.sector1TimeFormatted}
      isBest={data.position === 1}
      padding="px-3"
    />
    <SectorCell 
      time={data.sector2Time}
      formattedTime={data.sector2TimeFormatted}
    />
    <SectorCell 
      time={data.sector3Time}
      formattedTime={data.sector3TimeFormatted}
    />
  </tr>
)


// Constants
const TABLE_HEADERS = ['pos', 'status', 'type', 'time', 's1', 's2', 's3']

// Mock data - 실제로는 props로 받아올 예정
const mockData: DriverData[] = [
  {
    position: 1,
    driverCode: "NOR",
    positionChange: 2,
    status: "DRS",
    compound: "m",
    lap: 8,
    pitCount: 2,
    lastLapTime: "1:29:734.5",
    lastLapTimeFormatted: "1:29:734",
    gap: "+6.812",
    gapFormatted: "+6.812",
    sector1Time: "29:734",
    sector1TimeFormatted: "29:734",
    sector2Time: "29:734",
    sector2TimeFormatted: "29:734",
    sector3Time: "29:734",
    sector3TimeFormatted: "29:734"
  },
  {
    position: 2,
    driverCode: "VER",
    positionChange: -1,
    status: "DRS",
    compound: "m",
    lap: 8,
    pitCount: 1,
    lastLapTime: "1:29:741.3",
    lastLapTimeFormatted: "1:29:741",
    gap: "+12.456",
    gapFormatted: "+12.456",
    sector1Time: "29:741",
    sector1TimeFormatted: "29:741",
    sector2Time: "29:741",
    sector2TimeFormatted: "29:741",
    sector3Time: "29:741",
    sector3TimeFormatted: "29:741"
  },
  {
    position: 3,
    driverCode: "HAM",
    positionChange: 0,
    status: "DRS",
    compound: "h",
    lap: 8,
    pitCount: 0,
    lastLapTime: "1:29:756.2",
    lastLapTimeFormatted: "1:29:756",
    gap: "+18.234",
    gapFormatted: "+18.234",
    sector1Time: "29:756",
    sector1TimeFormatted: "29:756",
    sector2Time: "29:756",
    sector2TimeFormatted: "29:756",
    sector3Time: "29:756",
    sector3TimeFormatted: "29:756"
  }
]

const TimingTable: React.FC<TimingTableProps> = ({ 
  data = mockData, 
  className = "" 
}) => {
  return (
    <div className={`min-w-[800px] w-full ${className}`}>
      <table className="min-w-[800px] w-full max-w-[1000px] divide-y divide-gray-200">
        <thead className="text-white">
          <tr>
            {TABLE_HEADERS.map((header) => (
              <th key={header} className="py-3 text-center uppercase">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((driverData, index) => (
            <TimingRow key={`${driverData.driverCode}-${index}`} data={driverData} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TimingTable