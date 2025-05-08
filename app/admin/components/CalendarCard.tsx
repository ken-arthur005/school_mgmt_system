'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'
import { useState } from 'react';
import Calendar from 'react-calendar';

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];

const CalendarCard = () => {
  const [value, onChange] = useState<Value>(new Date());
  return (
    <Card className='h-full'>
        <CardHeader>
            <CardTitle className='text-center text-2xl font-semibold'>
                Calendar
            </CardTitle>
        </CardHeader>
        <CardContent className='w-full items-center justify-center'>
          <Calendar className="w-full items-center justify-center mt-6" onChange={onChange} value={value} />
        </CardContent>
    </Card>
  )
}

export default CalendarCard