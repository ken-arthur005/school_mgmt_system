"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
    {
      name: 'Monday',
      amount: 4000,
    },
    {
      name: 'Tuesday',
      amount: 3000,
    },
    {
      name: 'Wednesday',
      amount: 2000,
    },
    {
      name: 'Thursday',
      amount: 2780,
    },
    {
      name: 'Friday',
      amount: 1890,
    },
    
  ];
  

const BarFees = () => {
  return (
    <Card className='h-[100%]'>
        <CardHeader>
            <CardTitle>School Fees Collected </CardTitle>
        </CardHeader>
        <CardContent className='h-full'>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                width={500}
                height={300}
                data={data}
                margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
                >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#8ACCD5" activeDot={{ r: 8 }} />
                {/* <Line type="monotone" dataKey="uv" stroke="#82ca9d" /> */}
                </LineChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  )
}

export default BarFees