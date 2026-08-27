"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { firebaseAuth } from "@/lib/firebase/client";

export function AdminShell({children}:{children:ReactNode}){
 const pathname=usePathname();
 const router=useRouter();
 const [user,setUser]=useState<User|null>(null);
 const [checking,setChecking]=useState(true);
 useEffect(()=>{
   if(!firebaseAuth){setChecking(false);return;}
   return onAuthStateChanged(firebaseAuth,currentUser=>{setUser(currentUser);setChecking(false);if(!currentUser)router.replace("/");});
 },[router]);
 if(!firebaseAuth)return <main className="auth-check">Firebaseの環境変数を設定すると管理画面を利用できます。</main>;
 if(checking)return <main className="auth-check">ログイン状態を確認しています…</main>;
 if(!user)return null;
 async function handleLogout(){if(firebaseAuth)await signOut(firebaseAuth);router.replace("/");}
 return <div className="admin-layout"><aside className="sidebar"><Link href="/dashboard" className="brand">いいもの三瀬</Link><span className="sidebar-shop">commo<span className="commo-dot">.</span></span><nav className="nav"><Link className={`nav-main ${pathname==="/dashboard"?"active":""}`} href="/dashboard"><Icon name="home"/>ホーム</Link><Link className={`nav-main ${pathname==="/line/users"?"active":""}`} href="/line/users"><Icon name="users"/>顧客・アンケート</Link><Link className={`nav-main ${pathname.includes("/line/broadcasts")?"active":""}`} href="/line/broadcasts"><Icon name="send"/>配信</Link><Link className={`nav-main ${pathname.includes("analytics")?"active":""}`} href="/line/analytics"><Icon name="chart"/>分析</Link><Link className={`nav-main ${pathname.includes("settings")?"active":""}`} href="/line/settings"><Icon name="settings"/>設定</Link></nav><button type="button" className="logout" onClick={handleLogout}><Icon name="logout"/>ログアウト</button></aside><main className="content">{children}</main></div>
}
