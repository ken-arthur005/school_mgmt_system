'use client';
import React from 'react'
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
  
import { PieChart, Pie,  Cell, ResponsiveContainer, PieLabelRenderProps} from 'recharts';
const data = [
  { name: 'Active', value: 100 },
  { name: 'On leave', value: 5 },
  { name: 'Suspended', value: 5 },
];


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];


const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, }: PieLabelRenderProps ) => {
  const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
  const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN);
  const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > Number(cx) ? 'start' : 'end'} dominantBaseline="central">
      {`${(Number(percent) * 100).toFixed(0)}%`}
    </text>
  );
};

const PieTeacherStatus = () => {
  return (
    <Card className="h-[100%]"> 
        <CardHeader>
          <CardTitle>Teacher Status</CardTitle>
        </CardHeader>

        <CardContent className="h-full ">
          <ResponsiveContainer className="w-full h-full">
            <PieChart width={800} height={800}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
        
        <CardFooter>
          <div className="flex gap-5">
            <div className="flex gap-1">
              <div className="w-5 h-5 bg-[#0088FE] rounded-full" />
              <h2 className="text-xs">Active</h2>
            </div>
            <div className="flex gap-1">
              <div className="w-5 h-5 bg-[#FFBB28] rounded-full" />
              <h2 className="text-xs ">On leave</h2>
            </div>
            <div className="flex gap-1">
              <div className="w-5 h-5 bg-[#00C49F] rounded-full" />
              <h2 className="text-xs ">Suspended</h2>
            </div>
          </div>
        </CardFooter>
    </Card>
  )
}

export default PieTeacherStatus