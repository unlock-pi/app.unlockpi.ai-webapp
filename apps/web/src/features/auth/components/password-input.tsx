type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// The coss Input renders a positioned `<span>` wrapper around the actual
// <input>, so the eye toggle can sit inside that wrapper as a relative
// sibling. We stack it via the input's own [data-slot=input-control] parent
// by wrapping in a plain `<div className="relative">` — the coss Input keeps
// its shell styling; the button just floats on top of the right edge.
export default function PasswordInput({ className, label, ...props }: PasswordInputProps) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid w-full items-center gap-2">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <InputGroup>
        <InputGroupInput
          id={id}
          type={showPassword ? "text" : "password"}
          nativeInput
          aria-label="Password with toggle visibility"
          placeholder="Enter your password"
          className={""}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((previous) => !previous)}
                  size="icon-xs"
                  variant="ghost"
                />
              }
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </TooltipTrigger>
            <TooltipPopup>
              {showPassword ? "Hide password" : "Show password"}
            </TooltipPopup>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
//   return (
//     <div className="grid w-full items-center gap-2">
//       {label ? <Label htmlFor={id}>{label}</Label> : null}
//       <div className="relative">
//         <Input
//           id={id}
//           type={showPassword ? "text" : "password"}
//           nativeInput
//           className={cn("pe-10", className)}
//           {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
//         />
//         <button
//           type="button"
//           onClick={() => setShowPassword((previous) => !previous)}
//           aria-label={showPassword ? "Hide password" : "Show password"}
//           className="absolute inset-y-0 end-0 z-10 flex w-10 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
//         >
//           {showPassword ? (
//             <EyeOff className="size-4" aria-hidden="true" />
//           ) : (
//             <Eye className="size-4" aria-hidden="true" />
//           )}
//         </button>
//       </div>
//     </div>
//   );
}
