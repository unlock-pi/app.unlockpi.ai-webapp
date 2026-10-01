## don't abstract everything 


eg: when you create a route, don't directly just abstract everything

below is bad example of abstraction
```
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { getAdminDashboardData } from "@/features/admin/lib/admin-data";

export default async function AdminPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboard data={data} />;
}

```
instead you should have written a rough structure, so that if the user comes to visit the route code, they should be in a position to understand that ok this page is doing this, has this stuff and some components made to complement the page to make the page in better readablity for both humans and AI and if these want to make some change they should be easily able to understand the flow of the code and easily make changes



## don't reinvent the wheel by using the raw elements


you shouldn't use the core plain HTML elements like the input, or button etc , don't try to reinvent the wheel by making your own components unless required, because the components libraries like shadcn and coss.com/ui has already done the hard part, just use them, 



now i want you to go study the previous components that were used and go inside and see the code and tailwind css and over write the styles from the parent component not on the core components, which is responsible for the ring like ui it's **active**.