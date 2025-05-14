
import React from 'react'
import UserCard from '../components/Card'
import PieTeacherStatus from '../components/PieTeacherStatus'
import TeacherDataTable from '../components/TeacherDataTable';
import {  columns } from "../components/TeacherDataTable";
import {TeacherForm} from "../schemas/TeacherFormSchema"
import AddTeacher from '../components/AddTeacher';

async function getData(): Promise<TeacherForm[]> {
  // Fetch data from your API here.
  return [
    
  ]
}

const page = async () => {

  const data = await getData()
  return (
    <div className="w-full flex-col">
      <div className="flex gap-4 justify-between flex-wrap mt-6">
        <AddTeacher />
        <UserCard number={100} type="Teachers"/>
        <UserCard number={200} type="Males"/>
        <UserCard number={50} type="Females"/>
      </div>
      <div className="w-full lg:w-1/3 h-[305px] md:h-[330px] mt-5"><PieTeacherStatus/></div>
      <div className="container mx-auto py-10">
        <TeacherDataTable columns={columns} data={data}/>
      </div>      

    </div>
  )
}

export default page