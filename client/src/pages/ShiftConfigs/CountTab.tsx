import React from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/src/components/ui/form";
import { Input } from "@client/src/components/ui/input";
import type { ShiftFormValues } from "./types";

interface CountTabProps {
  form: UseFormReturn<ShiftFormValues>;
}

const CountTab: React.FC<CountTabProps> = ({ form }) => (
  <div className="space-y-4 pt-2">
    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="minCount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              每日最少人数 <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input type="number" min={0} step={1} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="maxCount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              每日最多人数 <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input type="number" min={0} step={1} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="holidayMinCount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>节假日最少人数</FormLabel>
            <FormControl>
              <Input type="number" min={0} step={1} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="holidayMaxCount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>节假日最多人数</FormLabel>
            <FormControl>
              <Input type="number" min={0} step={1} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
);

export default CountTab;
