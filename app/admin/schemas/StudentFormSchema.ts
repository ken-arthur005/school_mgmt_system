import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

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

export type StudentForm = z.infer<typeof formSchema>
