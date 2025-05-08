'use client';

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
  
import { PieChart, Pie,  Cell, ResponsiveContainer, PieLabelRenderProps} from 'recharts';
const data = [
  { name: 'Paid', value: 1000 },
  { name: 'Not Paid', value: 500 },
  { name: 'Partial', value: 200 },
];
import React from 'react'

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

const PieFeesPaid = () => {
  return (
    <Card className="h-[100%]"> 
        <CardHeader>
          <CardTitle>Fees Paid Percentage Chart</CardTitle>
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
              <h2 className="text-xs">Paid</h2>
            </div>
            <div className="flex gap-1">
              <div className="w-5 h-5 bg-[#FFBB28] rounded-full" />
              <h2 className="text-xs ">Partial</h2>
            </div>
            <div className="flex gap-1">
              <div className="w-5 h-5 bg-[#00C49F] rounded-full" />
              <h2 className="text-xs ">Not Paid</h2>
            </div>
          </div>
        </CardFooter>
    </Card>
  )
}

export default PieFeesPaid