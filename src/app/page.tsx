import { redirect } from "next/navigation";

/**
 * The legacy static site had several competing "homepage" variants
 * (index.html, index2.html, index-company.html — mostly vendor demo
 * leftovers, see FUNCTIONALITY_STATUS.md). For this app, "/" is simply the
 * public sign-in/register page; "/newsfeed" is the real signed-in home.
 */
export default function RootPage() {
  redirect("/login");
}
