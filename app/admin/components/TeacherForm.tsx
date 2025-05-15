"use client";
import React, { useEffect } from 'react';


{/* ALL IMPORTS  */}
import {useForm, useFieldArray} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod";
import { Form, FormControl,  FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from './sidebar_components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "react-calendar"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formSchema,  } from '../schemas/TeacherFormSchema';
// import { Checkbox } from '@/components/ui/checkbox';
import type {TeacherForm} from '../schemas/TeacherFormSchema'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multiselect';


        type TeacherFormProps ={
            closeDialog: () => void;
        };

    const TeacherForm: React.FC<TeacherFormProps> = ({closeDialog}:{closeDialog:()=>void}) => {
    
    {/* INITIAL DATA STATES */}
        const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            middleName:"",
            lastName: "",
            age: 0,
            gender: "male" ,
            dob: new Date(),
            PhoneNumber: "",
            email: "",
            address: "",
            GPSaddress:"",
            assignments:[],
        }
    })

    {/* DATE OF BIRTH CALCULATED TO AGE FUNCTION */}
    const dob = form.watch("dob")
    useEffect(() => {
        if (dob) {
          const dobDate = new Date(dob)
          const today = new Date()
          let age = today.getFullYear() - dobDate.getFullYear()
          const m = today.getMonth() - dobDate.getMonth()
      
          if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
            age--
          }
      
          form.setValue("age", age, {
            shouldValidate: true
          })
        }
      }, [dob, form])


      {/* SUBMIT FUNCTION */}
      const onSubmit = (data: TeacherForm) => {
        window.alert("form submission triggered");
        const local = data.PhoneNumber.trim().replace(/^0/, "").replace(/^\+?233/, '');
        const formatted = `+233${local}`;
      
        const finalData = {
          ...data,
          guardianPhoneNumber: formatted,
        };

        window.alert("Form saved ✅");
      
        console.log("Submitted", finalData);
        closeDialog();
      }; 

      const { fields, append, remove } = useFieldArray({
            control: form.control,
            name: "assignments",
        });


      const classes = [
        { id: "class-6", name: "Class 6" },
        { id: "jhs-3", name: "JHS 3" },
            ];

        const subjects = [
        { id: "maths", name: "Maths" },
        { id: "science", name: "Science" },
        { id: "history", name: "History" },
        ];

  return (
      
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-3">
            
                <Tabs defaultValue='PersonalInfo'>
               
                
                <TabsList className="grid w-full grid-cols-3 gap-4 mb-3">
                    <TabsTrigger value="PersonalInfo" className='text-[11px]'>Personal Information</TabsTrigger>
                    <TabsTrigger value="ContactInfo" className='text-[11px]'>Contact Information</TabsTrigger>
                    <TabsTrigger value="ProfessionalInfo" className='text-[11px]'>Professional Information</TabsTrigger>
                </TabsList>

                {/* STUDENT INFORMATION PART */}
                <TabsContent value='PersonalInfo' className=''>
                <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                    <FormItem className='my-3'>
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
                name="middleName"
                render={({ field }) => (
                    <FormItem className='my-3'>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                        <Input placeholder="if any..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                    <FormItem className='my-3'>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                        <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <div className='flex w-full '>

                    <FormField 
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Gender</FormLabel>
                        <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-y-1"
                        >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="male" />
                            </FormControl>
                            <FormLabel className="font-normal">
                                Male
                            </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="Female" />
                            </FormControl>
                            <FormLabel className="font-normal">
                                Female
                            </FormLabel>
                        </FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                        )}
                        />
                </div>

                <div className='flex w-full gap-4'>
                    <FormField
                        control={form.control}
                        name="dob"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Date of birth</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[240px] pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                >
                                                {field.value ? (
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className=" sm:w-[80vw]  p-0" align="start">
                                        <Calendar
                                            className="items-center w-[20px]"
                                            value={field.value}
                                            onChange={field.onChange}
                                            tileDisabled={({ date }: { date: Date }) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                        />

                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField 
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                            <FormItem className='w-1/3'>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                                <Input type="number"  {...field} readOnly/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

            </TabsContent>


            <TabsContent value='ContactInfo' className=''>

                <FormField
                    control={form.control}
                    name="PhoneNumber"
                    render={({ field }) => (
                        <FormItem className="my-3">
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                            <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">+233</span>
                            <Input
                                type="tel"
                                {...field}
                                onBlur={(e) => {
                                const input = e.target.value.trim();
                                if (input.startsWith("0")) {
                                    form.setValue("PhoneNumber", input.slice(1));
                                }
                                }}
                                placeholder="551234567"
                            />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className='my-3'>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="johndoe@123.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem className='my-3'>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                            <Input placeholder="" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="GPSaddress"
                    render={({ field }) => (
                        <FormItem className='my-3'>
                        <FormLabel>GPS Address</FormLabel>
                        <FormControl>
                            <Input placeholder="" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                
                </TabsContent>
                
                {/* PROFESSIONAL INFORMATION PART */}
                <TabsContent value='ProfessionalInfo' className=''>
                    {/* <FormField
                        control={form.control}
                        name="classes"
                        render={() => (
                            <FormItem className='mt-5'>
                            <div className="mb-4">
                                <FormLabel className="text-base">Classes Taught</FormLabel>
                                <FormDescription>
                                Select the class
                                </FormDescription>
                            </div>
                            {classes.map((classes) => (
                                <FormField
                                key={classes.id}
                                control={form.control}
                                name="classes"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={classes.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(classes.id)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value ?? []), classes.id])
                                                : field.onChange(
                                                    (field.value ??[]).filter(
                                                    (value) => value !== classes.id
                                                    )
                                                )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        {classes.label}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                                />
                            ))}
                            <FormMessage />
                            </FormItem>
                            )}
                    />

                    <FormField
                        control={form.control}
                        name="subjects"
                        render={() => (
                            <FormItem className='mt-6'>
                            <div className="mb-4">
                                <FormLabel className="text-base">Subjects Taught</FormLabel>
                                <FormDescription>
                                Select the subjects
                                </FormDescription>
                            </div>
                            {subjects.map((subjects) => (
                                <FormField
                                key={subjects.id}
                                control={form.control}
                                name="subjects"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={subjects.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(subjects.id)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value ??[]), subjects.id])
                                                : field.onChange(
                                                    (field.value ??[]).filter(
                                                    (value) => value !== subjects.id
                                                    )
                                                )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        {subjects.label}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                                />
                            ))}
                            <FormMessage />
                            </FormItem>
                            )}
                    />
                     */}

                         {fields.map((field, index) => (
        <div key={field.id} className="p-4 border rounded-md space-y-3">
          <label className="text-sm font-semibold">Assignment {index + 1}</label>

          {/* Class Select */}
          <Select onValueChange={(val) => form.setValue(`assignments.${index}.classes`, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subject Multi-Select */}
          <MultiSelect
            options={subjects}
            selected={form.watch(`assignments.${index}.subjects`) || []}
            onChange={(val) => form.setValue(`assignments.${index}.subjects`, val)}
          />

          <Button variant="destructive" type="button" onClick={() => remove(index)}>Remove</Button>
        </div>
      ))}

      <Button
        type="button"
        onClick={() =>
          append({
            classes: "",
            subjects: [],
          })
        }
      >
        + Add Class Assignment
      </Button>

      

                </TabsContent>

                <Button type="submit">Submit</Button>
            </Tabs>

            </form>
        </Form>
    
  ) 
}

export default TeacherForm