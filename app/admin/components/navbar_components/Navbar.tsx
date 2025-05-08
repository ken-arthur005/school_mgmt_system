import { Search } from 'lucide-react'
import React from 'react'
import { NavUser } from './nav-user'



const data = {
    user: {
        name: "carey",
        role: "admin",
        avatar:"/me.png"
    }
}

const Navbar = () => {
  return (
    
    
    <div className='w-full flex items-center justify-between p-4'>
        <div className='hidden md:flex gap-1 items-center text-xs rounded-full ring-[1.5px] ring-gray-300 px-2'>
            <Search />
            <input type='text' placeholder=' Search...' className='w-[200px] p-2 bg-transparent outline-none' />
        </div>

        <div className='flex items-center gap-6'>
            <NavUser user={data.user} />
        </div>
       
    </div>
    
  )
}

export default Navbar