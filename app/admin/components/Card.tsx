import React from 'react'
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
  
  type UserCardProps = {
    type: string;
    number: number;
  }

  
const UserCard = ({type, number}: UserCardProps) => {
  return (
    <Card className='odd:bg-[#F8F8E1] even:bg-[#8ACCD5] p-4 flex-1 min-w-[130px]'>
        <CardHeader>
            <CardTitle className='flex justify-between items-center'><span className='text-[10px] bg-white px-2 py-1 rounded-full text-[#FF90BB]'>2024/25</span></CardTitle>
        </CardHeader>
        <CardContent>
            <h1 className='text-2xl font-semibold my-4'>{number}</h1>
        </CardContent>
        <CardFooter className='capitalize font-semibold text-gray-500'>
            {type}
        </CardFooter>
    </Card>
  )
}

export default UserCard