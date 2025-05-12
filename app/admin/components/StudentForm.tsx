"use client";
import React, { useEffect } from 'react';

{/* ALL IMPORTS  */}
import { isValidPhoneNumber } from "libphonenumber-js"
import { z } from "zod"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from './sidebar_components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue  } from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';


{/* FORM SCHEMA  */}
const formSchema = z.object({
  firstName: z.string().min(2, {
    message: "Name must be at least 2 letters"
  }).max(50, {
    message: "Name must not be more than 50 letters"
  }),

  middleName: z.string().optional(),

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

  level: z.string().min(1, {
    message: "level must be at least 1"
  }).max(50, {
    message: "level must not be more than 9"
  }),

  gender: z.enum(["male", "female"]),

  feeStatus: z.string(),

  dob: z.date({
    required_error: "A date of birth is required.",
  }),

  guardianFullName: z.string().min(2, {
    message: "Name must be at least 2 letters"
  }).max(50, {
    message: "Name must not be more than 50 letters"
  }),


  guardianPhoneNumber: z
  .string()
  .refine((val) => {
    const cleaned = val.replace(/^0/, '').replace(/^\+?233/, '');
    return isValidPhoneNumber(`+233${cleaned}`);
  }, { message: "Invalid phone number" }),
    email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .or(z.literal(""))
    .optional(),  
  relationToStudent: z.string(),
  occupation:z.string().optional(),
  address: z.string().optional(),
  GPSaddress: z.string().optional(),
  allergies: z.enum(["yes", "no"]),
  allergiesDetails: z.string().optional(),
  conditions: z.enum(["yes", "no"]),
  conditionDetails: z.string().optional(),
  bloodType: z.enum(["A", "B", "AB", "O", ""]),
    }).refine(
    (data) => {
      if (data.allergies === "yes") {
        return !!data.allergiesDetails?.trim();
      }
      return true;
    },  {
        path: ["allergyDetails"],
        message: "Please describe your allergies",
      }
    ).refine(
        (data) => {
          if (data.conditions === "yes") {
            return !!data.conditionDetails?.trim();
          }
          return true;
        },  {
            path: ["conditionDetails"],
            message: "Please describe your health conditions",
          }
        );
    
        type StudentFormProps ={
            closeDialog: () => void;
        };

    const StudentForm: React.FC<StudentFormProps> = ({closeDialog}:{closeDialog:()=>void}) => {
    
    {/* INITIAL DATA STATES */}
        const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            middleName:"",
            lastName: "",
            age: 0,
            gender: "male" ,
            feeStatus: "",
            dob: new Date(),
            guardianFullName: "",
            guardianPhoneNumber: "",
            email: "",
            occupation:"unemployed",
            relationToStudent: "",
            address: "",
            GPSaddress:"",
            allergies: "no",
            allergiesDetails: "",
            conditions: "no",
            conditionDetails:"",
            bloodType: "",
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

      const allergiesValue = form.watch("allergies");
      const conditionValue = form.watch("conditions");

      {/* SUBMIT FUNCTION */}
      const onSubmit = (data: z.infer<typeof formSchema>) => {
        window.alert("form submission triggered");
        const local = data.guardianPhoneNumber.trim().replace(/^0/, "").replace(/^\+?233/, '');
        const formatted = `+233${local}`;
      
        const finalData = {
          ...data,
          guardianPhoneNumber: formatted,
        };

        window.alert("Form saved ✅");
      
        console.log("Submitted", finalData);
        closeDialog();
      }; 


  return (
      
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-3">
            
                <Tabs defaultValue='studentInfo'>
               
                
                <TabsList className="grid w-full grid-cols-3 gap-4 mb-3">
                    <TabsTrigger value="studentInfo" className='text-sm'>Student Information</TabsTrigger>
                    <TabsTrigger value="guardianInfo" className='text-sm'>Guardian Information</TabsTrigger>
                    <TabsTrigger value="healthInfo" className='text-sm'>Health Information</TabsTrigger>
                </TabsList>

                {/* STUDENT INFORMATION PART */}
                <TabsContent value='studentInfo' className=''>
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
                        name="level"
                        render={({ field }) => (
                            <FormItem className="w-1/3 ">
                            <FormLabel className='text-center'>Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                        
                        <FormControl>
                                <SelectTrigger className='w-2/3 rounded-md mx-2 border-2'>
                                    <SelectValue placeholder="Level"/>
                                </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>BASIC SCHOOL</SelectLabel>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="6">6</SelectItem>
                            </SelectGroup>
                            <SelectGroup>
                                <SelectLabel>JUNIOR HIGH</SelectLabel>
                                <SelectItem value="7">1</SelectItem>
                                <SelectItem value="8">2</SelectItem>
                                <SelectItem value="9">3</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

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
                        className="flex flex-col space-y-1"
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
                                            className="items-center"
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
                
                {/* GUARDIAN INFORMATION PART */}
                <TabsContent value='guardianInfo' className=''>
                    <FormField
                    control={form.control}
                    name="guardianFullName"
                    render={({ field }) => (
                        <FormItem className='my-3'>
                        <FormLabel>Guardian Full Name</FormLabel>
                        <FormControl>
                            <Input placeholder="" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="guardianPhoneNumber"
                    render={({ field }) => (
                        <FormItem className="my-3">
                        <FormLabel>Guardian Phone Number</FormLabel>
                        <FormControl>
                            <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">+233</span>
                            <Input
                                type="tel"
                                {...field}
                                onBlur={(e) => {
                                const input = e.target.value.trim();
                                if (input.startsWith("0")) {
                                    form.setValue("guardianPhoneNumber", input.slice(1));
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
                    name="relationToStudent"
                    render={({ field }) => (
                        
                        <FormItem className='my-3 flex'>
                        <FormLabel>Relation to student</FormLabel>
                        <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="mother">Mother</SelectItem>
                            <SelectItem value="father">Father</SelectItem>
                            <SelectItem value="uncle">Uncle</SelectItem>
                            <SelectItem value="aunt">Aunty</SelectItem>
                            <SelectItem value="brother">Brother</SelectItem>
                            <SelectItem value="sister">Sister</SelectItem>
                            <SelectItem value="brother-in-law">Brother-in-law</SelectItem>
                            <SelectItem value="sister-in-law">Sister-in-law</SelectItem>
                            <SelectItem value="grandfather">Grandfather</SelectItem>
                            <SelectItem value="grandmother">Grandmother</SelectItem>
                            <SelectItem value="great_grandfather">Great Grandfather</SelectItem>
                            <SelectItem value="great_grandmother">Great Grandmother</SelectItem>
                        </SelectContent>
                        </Select>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="occupation"
                    render={({ field }) => (
                        <FormItem className='my-3'>
                        <FormLabel>Occupation (leave blank if unemployed)</FormLabel>
                        <FormControl>
                            <Input placeholder="teacher" {...field} />
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
                
                {/* HEALTH INFORMATION PART */}
                <TabsContent value='healthInfo' className='space-y-3'>
                <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                    <FormItem className=" flex gap-2">
                        <FormLabel className=''>Allergies?</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-y-1 space-x-3"
                            >
                            <FormItem className="flex items-center  ">
                                <FormControl>
                                <RadioGroupItem value={"no"} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    No
                                </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center  ">
                                <FormControl>
                                <RadioGroupItem value={"yes"} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    Yes
                                </FormLabel>
                            </FormItem>
                    
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                 )}
                />

                {allergiesValue === "yes" && (    <FormField
                    control={form.control}
                    name="allergiesDetails"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Please describe in detail</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder=""
                            className="resize-none"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                            )}
                        />
                    )}


                <FormField
                    control={form.control}
                    name="conditions"
                    render={({ field }) => (
                    <FormItem className=" flex gap-2">
                        <FormLabel className=''>Any pre-existing health conditions?</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-y-1 space-x-3"
                            >
                            <FormItem className="flex items-center  ">
                                <FormControl>
                                <RadioGroupItem value={"no"} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    No
                                </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center  ">
                                <FormControl>
                                <RadioGroupItem value={"yes"} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    Yes
                                </FormLabel>
                            </FormItem>
                    
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                 )}
                />

                {conditionValue === "yes" && (    <FormField
                    control={form.control}
                    name="conditionDetails"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Please describe in detail</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder=""
                            className="resize-none"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                            )}
                        />
                    )}

                    <FormField
                    control={form.control}
                    name="bloodType"
                    render={({ field }) => (
                        
                        <FormItem className='my-3 flex'>
                        <FormLabel>Blood Type (Leave blank if you do not know)</FormLabel>
                        <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="AB">AB</SelectItem>
                            <SelectItem value="0">O</SelectItem>
                            {/* <SelectItem value="">Not sure</SelectItem> */}
                        </SelectContent>
                        </Select>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />


                </TabsContent>
                
                <Button type="submit">Submit</Button>
            </Tabs>

            </form>
        </Form>
    
  ) 
}

export default StudentForm