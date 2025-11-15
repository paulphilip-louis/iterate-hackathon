import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  companyValues: z.string().min(1, "Company values are required"),
  jobDescription: z.string().min(1, "Job description is required"),
  candidateLinkedInUrl: z.string().min(1, "LinkedIn URL is required"),
});

export type FormData = z.infer<typeof formSchema>;

interface FormScreenProps {
  onSubmit: (data: FormData) => void | Promise<void>;
}

export function FormScreen({ onSubmit }: FormScreenProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="min-h-0 space-y-4">
      <div className="min-h-0 space-y-2">
        <Label htmlFor="companyValues">Company Values</Label>
        <Input
          id="companyValues"
          type="text"
          {...register("companyValues")}
          className={errors.companyValues ? "border-red-500" : ""}
        />
        {errors.companyValues && (
          <p className="text-sm text-red-500">{errors.companyValues.message}</p>
        )}
      </div>

      <div className="min-h-0 space-y-2">
        <Label htmlFor="jobDescription">Job Description</Label>
        <Input
          id="jobDescription"
          type="text"
          {...register("jobDescription")}
          className={errors.jobDescription ? "border-red-500" : ""}
        />
        {errors.jobDescription && (
          <p className="text-sm text-red-500">
            {errors.jobDescription.message}
          </p>
        )}
      </div>

      <div className="min-h-0 space-y-2">
        <Label htmlFor="candidateLinkedInUrl">Candidate LinkedIn URL</Label>
        <Input
          id="candidateLinkedInUrl"
          type="url"
          {...register("candidateLinkedInUrl")}
          className={errors.candidateLinkedInUrl ? "border-red-500" : ""}
        />
        {errors.candidateLinkedInUrl && (
          <p className="text-sm text-red-500">
            {errors.candidateLinkedInUrl.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Hop in!"}
      </Button>
    </form>
  );
}
