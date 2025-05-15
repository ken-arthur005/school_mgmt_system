import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";



{/* FORM SCHEMA  */}
export const formSchema = z.object(
  {
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

  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .or(z.literal("")),

  // classes: z.array(z.string()).refine((value) => value.some((item) => item), {
  //   message: "You have to select at least one item.",
  // }),

  // subjects: z.array(z.string()).refine((value) => value.some((item) => item), {
  //   message: "You have to select at least one item.",
  // }),

  assignments: z
    .array(
      z.object({
        classes: z.string().min(1, "Class is required"),
        subjects: z
          .array(z.string().min(1))
          .min(1, "At least one subject must be selected"),
      })
    )
    .min(1, "At least one assignment is required").refine(
  (data) => {
    const classes = data.map(a => a.classes);
    return new Set(classes).size === classes.length;
  },
  {
    message: "Each class can only be assigned once.",
    path: ["assignments"],
  }
)
,

  gender: z.enum(["male", "female"]),

  dob: z.date({
    required_error: "A date of birth is required.",
  }),

  PhoneNumber: z
  .string()
  .refine((val) => {
    const cleaned = val.replace(/^0/, '').replace(/^\+?233/, '');
    return isValidPhoneNumber(`+233${cleaned}`);
  }, { message: "Invalid phone number" }),


  address: z.string().optional(),
  GPSaddress: z.string().optional(),
  
    });

export type TeacherForm = z.infer<typeof formSchema>