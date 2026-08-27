"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { firebaseAuth } from "@/lib/firebase/client";

const groups:{label:string;icon:IconName;href:string;children:{label:string;href:string}[]}[]=[
  {label:"顧客管理",icon:"users",href:"/line/users",children:[{label:"顧客一覧",href:"/line/users"},{label:"セグメント",href:"/line/segments"}]},
  {label:"配信",icon:"send",href:"/line/broadcasts",children:[{label:"配信一覧",href:"/line/broadcasts"},{label:"配信を作成",href:"/line/broadcasts/composer"},{label:"アンケート",href:"/line/surveys"},{label:"テンプレート",href:"/line/broadcasts#templates"}]},
  {label:"分析",icon:"chart",href:"/line/analytics",children:[{label:"全体分析",href:"/line/analytics"},{label:"配信分析",href:"/line/analytics#broadcasts"}]},
];
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
 return <div className="admin-layout"><aside className="sidebar"><Link href="/dashboard" className="brand">いいもの三瀬</Link><span className="sidebar-shop">LINE運用管理</span><nav className="nav"><Link className={`nav-main ${pathname==="/dashboard"?"active":""}`} href="/dashboard"><Icon name="home"/>ホーム</Link>{groups.map(g=><div className="nav-group" key={g.label}><Link className="nav-main" href={g.href}><Icon name={g.icon}/>{g.label}<span className="nav-up">⌃</span></Link><div className="nav-children">{g.children.map(c=><Link key={c.href} className={pathname===c.href.split("#")[0]&&!c.href.includes("#")?"active":""} href={c.href}>{c.label}</Link>)}</div></div>)}<Link className={`nav-main ${pathname.includes("ai-suggestions")?"active":""}`} href="/line/ai-suggestions"><Icon name="spark"/>AI提案</Link><Link className={`nav-main ${pathname.includes("settings")?"active":""}`} href="/line/settings"><Icon name="settings"/>設定</Link></nav><button type="button" className="logout" onClick={handleLogout}><Icon name="logout"/>ログアウト</button></aside><main className="content">{children}</main></div>
}
