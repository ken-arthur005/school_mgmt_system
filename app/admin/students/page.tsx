
import React from 'react'
import UserCard from '../components/Card'
import EnrollStudent from '../components/EnrollStudent'
import StudentDataTable from '../components/StudentDataTable';
import {  columns } from "../components/StudentDataTable"
import {StudentForm} from "../schemas/StudentFormSchema"

async function getData(): Promise<StudentForm[]> {
  // Fetch data from your API here.
  return [
    {
            firstName: "Carey",
            middleName:"Churchill",
            lastName: "Ken-Arthur",
            age: 20,
            level:"5",
            gender: "male" ,
            feeStatus: "paid",
            dob: new Date(),
            guardianFullName: "Pearl",
            guardianPhoneNumber: "0209301239",
            email: "careyckenarthur201@gmail.com",
            occupation:"unemployed",
            relationToStudent: "mother",
            address: "jhdskjdskf",
            GPSaddress:"dsklfdgjkds",
            allergies: "no",
            allergiesDetails: "",
            conditions: "no",
            conditionDetails:"",
            bloodType:"AB",
    },
    {
            firstName: "Kyllian",
            middleName:"Mpaypal",
            lastName: "Lotin",
            age: 21,
            level:"5",
            gender: "male" ,
            feeStatus: "paid",
            dob: new Date(),
            guardianFullName: "Pearl",
            guardianPhoneNumber: "0209301239",
            email: "careyckenarthur201@gmail.com",
            occupation:"unemployed",
            relationToStudent: "mother",
            address: "jhdskjdskf",
            GPSaddress:"dsklfdgjkds",
            allergies: "no",
            allergiesDetails: "",
            conditions: "no",
            conditionDetails:"",
            bloodType:"AB",
    },
    // ...
  ]
}

const page = async () => {

  const data = await getData()
  return (
    <div className="w-full flex-col">
      <div className="flex gap-4 justify-between flex-wrap mt-6">
        <EnrollStudent />
        <UserCard number={100} type="students"/>
        <UserCard number={200} type="Boys"/>
        <UserCard number={50} type="Girls"/>
      </div>
      <div className="container mx-auto py-10">
        <StudentDataTable columns={columns} data={data}/>
      </div>      

    </div>
  )
}

export default page