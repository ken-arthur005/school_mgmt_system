"use client";
import React from 'react'
import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  // ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table"

import { MoreHorizontal } from "lucide-react"
import { ArrowUpDown } from "lucide-react"
 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TeacherForm } from '../schemas/TeacherFormSchema';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}



export const columns: ColumnDef<TeacherForm>[] = [
  {
    accessorKey: "firstName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          First Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "middleName",
    header: "Middle Name",
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
  },
  {
    accessorKey: "gender",
    header: "Gender",
  },
  {
    accessorKey: "age",
   header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Age
          <ArrowUpDown className=" h-4 " />
        </Button>
      )
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "level",
    header: "Level",
  },

  {
    id: "actions",
    cell: ({ row }) => {
      const profile = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {/* <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(profile.id)}
            >
              Copy profile ID
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit student profile </DropdownMenuItem>
            <DropdownMenuItem>View student profile</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },

  
]



const TeacherDataTable = <TData, TValue> ({
    columns,
    data,
}: DataTableProps<TData, TValue>) => {



    const [sorting, setSorting] = React.useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState<string>("")
    const table = useReactTable({
  
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
    globalFilter: 'search term', 
    },

    state: {
      sorting,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter
  })

  

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          value={globalFilter || ""}
          onChange={e => table.setGlobalFilter(String(e.target.value))}
          placeholder="Search..."
          className="max-w-sm"
        />
        
      </div>
      
    <div className="rounded-md border">
      <Table>
        <TableHeader className=''>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
    
  )
} 

export default TeacherDataTable