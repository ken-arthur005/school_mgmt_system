'use client';

import Annnouncement from "./components/AttendanceBarChart";
import AttendanceBarChart from "./components/AttendanceBarChart";
import BarFees from "./components/BarFees";
import CalendarCard from "./components/CalendarCard";
import UserCard from "./components/Card";
import PieFeesPaid from "./components/PieFeesPaid";
import Recent from "./components/Recent";
import Semester from "./components/Semester";



export default function Page() {
  return (
    <div> 
      <div className="p-4 flex gap-4 flex-col md:flex-row ">
        <div className="w-full lg:w-2/3">
          <div className="flex gap-4 justify-between flex-wrap">
              <UserCard number={100} type="students"/>
              <UserCard number={200} type="teachers"/>
              <UserCard number={50} type="non-teaching staff"/>
              <UserCard number={20} type="parents"/>
          </div>
          {/* FEES SECTION - MIDDLE */}
          <div className="flex gap-4 flex-col lg:flex-row my-6">
              <div className="w-full lg:w-1/3 h-[305px] md:h-[450px]"><PieFeesPaid/></div>
              <div className="w-full lg:w-2/3 h-[305px] md:h-[450px]"><BarFees/></div>
          </div>

          {/* ATTENDANCE SECTION - MIDDLE */}
          <div className="w-full h-[450px] mb-6">
            <AttendanceBarChart/>
          </div>
        </div>

        {/* RIGHT SIDE  */}
        <div className="w-full lg:w-1/3">
          {/* DAYS TO END SEM PART */}
          <div className="flex w-full mb-5">
            <Semester/>
          </div>
          
          <div className="mt-4 lg:h-[50%]">
            <CalendarCard/>
          </div>

          <div className="mt-4">
            <Recent/>
          </div>

          <div className="mt-4">
            <Annnouncement/>
          </div>
        </div>
      </div>
       

       
    </div>

  )
}
