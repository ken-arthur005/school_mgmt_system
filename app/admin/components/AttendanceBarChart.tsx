'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  {
    name: 'Monday',
    present: 4000,
    absent: 2400,
  },
  {
    name: 'Tuesday',
    present: 3000,
    absent: 1398,
  },
  {
    name: 'Wednesday',
    present: 2000,
    absent: 9800,
  },
  {
    name: 'Thursday',
    present: 2780,
    absent: 3908,
  },
  {
    name: 'Friday',
    present: 1890,
    absent: 4800,
  },
];


const AttendanceBarChart = () => {
  return (
    <Card className='h-full'>
    <CardHeader>
        <CardTitle>
            Attendance
        </CardTitle>
    </CardHeader>
    <CardContent className='h-full w-full'>
    <ResponsiveContainer width="100%" height="100%">
        <BarChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" orientation="left" stroke="#8ACCD5" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="absent" fill="#8ACCD5" />
          <Bar yAxisId="right" dataKey="present" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
</Card>
  )
}

export default AttendanceBarChart;