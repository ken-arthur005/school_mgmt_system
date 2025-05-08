import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'


import React from 'react'

const Semester = () => {
  return (
    <div className='flex w-full gap-3 h-[50%]'>
        <div className='w-[50%] '>
            <Card className='w-full h-full'>
                <CardHeader >
                    <CardTitle className='text-center'>2024/25</CardTitle>
            
                </CardHeader>
                <CardContent>
                    <h1 className='text-2xl font-semibold text-center '> SEMESTER 1</h1>
                </CardContent>
            </Card>
        </div>
        
        <div className='w-[50%] '>
            <Card className='h-full'>
                <CardHeader>
                        <CardTitle>Days to end the semester:</CardTitle>
                </CardHeader>
                <CardContent>
                    <h1 className='text-2xl font-semibold text-center '> 120 days</h1>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}

export default Semester