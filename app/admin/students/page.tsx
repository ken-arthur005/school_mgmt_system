import React from 'react'
import UserCard from '../components/Card'
import EnrollStudent from '../components/EnrollStudent'

const page = () => {
  return (
    <div className="w-full">
      <div className="flex gap-4 justify-between flex-wrap mr-10 mt-4">
        <EnrollStudent />
        <UserCard number={100} type="students"/>
        <UserCard number={200} type="Boys"/>
        <UserCard number={50} type="Girls"/>
        
      </div>
    </div>
  )
}

export default page