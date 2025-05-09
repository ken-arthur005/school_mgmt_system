"use client"
import React from 'react';

import { isValidPhoneNumber } from "libphonenumber-js"
import { z } from "zod"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from './sidebar_components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "Name must be at least 2 letters"
  }).max(50, {
    message: "Name must not be more than 50 letters"
  }),

  lastName: z.string().min(2, {
    message: "Name must be at least 2 letters"
  }).max(50, {
    message: "Name must not be more than 50 letters"
  }),

  age: z.coerce.number().min(1, {
    message: "Age must be at least 1"
  }).max(50, {
    message: "Age must not be more than 50"
  }),

  gender: z.string(),

  feeStatus: z.boolean(),

  DoB: z.date(),

  guardianFirstName: z.string().min(2, {
    message: "Name must be at least 2 letters"
  }).max(50, {
    message: "Name must not be more than 50 letters"
  }),

  guardianLastName: z.string().min(2, {
    message: "Name must be at least 2 letters"
  }).max(50, {
    message: "Name must not be more than 50 letters"
  }),

  guardianPhoneNumber: z.string().refine((val) => isValidPhoneNumber(val), {
    message: "Invalid phone number",
}),
  email: z.string().email({
    message:"Please enter a valid email address"
  }),
  relationshipToStudent: z.string(),
  address: z.string(),
  allergies: z.boolean(),
  conditions: z.string(),
  bloodType: z.string(),
})


const StudentForm = () => {
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            age: 0,
            gender: "",
            feeStatus: false,
            DoB: new Date(),
            guardianFirstName: "",
            guardianLastName: "",
            guardianPhoneNumber: "",
            email: "",
            relationshipToStudent: "",
            address: "",
            allergies: false,
            conditions: "",
            bloodType: "",
        }
    })

    const onSubmit = (data:z.infer<typeof formSchema>) => {
        console.log("Submitted", data)
    }

  return (
    <>  
        {/* <h1 className='text-center'>STUDENT ENROLLMENT FORM</h1> */}
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                        <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                        <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                

            <Button type="submit">Submit</Button>
        </form>
        </Form>
    </>
  )
}

export default StudentForm