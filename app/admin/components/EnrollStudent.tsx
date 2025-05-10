"use client";
import React from 'react';
import { Card, CardContent,  CardHeader, CardTitle } from '@/components/ui/card'
import { FileUser, Plus } from 'lucide-react'
import  { useState,  } from 'react'

import {
    Dialog,
    DialogContent,
    DialogTitle, 
    DialogTrigger,
  } from "@/components/ui/dialog"
import StudentForm from './StudentForm';



const EnrollStudent = () => {

    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen} >
            <DialogTrigger asChild className='p-4 flex-1 min-w-[130px] max-w-[200px] h-full hover:shadow-2xl hover:bg-linear-to-r from-[#F8F8E1] to-[#8ACCD5]'>
                <Card className='p-4 flex-1 min-w-[130px] h-full'>
                    <CardHeader>
                        <CardTitle className='flex justify-between items-center text-center'>ENROLL STUDENT</CardTitle>
                    </CardHeader>
                    <CardContent className='flex gap-3'>
                        <h1 className='text-2xl font-semibold my-4 flex items-center'><FileUser size={50}/><Plus size={30}/></h1>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle className='text-center'>Student Enrollment Form</DialogTitle>
                <StudentForm closeDialog={()=> setIsOpen(false)}/>
            </DialogContent>
        </Dialog>
  )
}

export default EnrollStudent