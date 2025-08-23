import * as React from "react";
import { type VariantProps } from "class-variance-authority";
declare const badgeVariants: any;
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
}
declare function Badge({ className, variant, ...props }: BadgeProps): any;
export { Badge, badgeVariants };
//# sourceMappingURL=badge.d.ts.map