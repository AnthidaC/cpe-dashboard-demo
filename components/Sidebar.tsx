'use client';
// components/Sidebar.tsx — Professional Executive Sidebar with Projects Directory Link

import { useState, useEffect, useMemo } from 'react';
import { getProjects } from '@/lib/db/dataService';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { useFilters } from '@/lib/FilterContext';
import { Project } from '@/lib/mockData';
import { academicYears } from '@/lib/reportUtils';

// Professional SVG Icons
const Icons = {
  Overview: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Projects: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  G1: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  G2: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  G3: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  G4: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  G5: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Participants: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  ),
  Database: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
};

const groupNavItems = [
  { href: '/g1', Icon: Icons.G1, label: 'ประสิทธิภาพ & งบประมาณ' },
  { href: '/g2', Icon: Icons.G2, label: 'การเข้าร่วม & เป้าหมาย' },
  { href: '/g3', Icon: Icons.G3, label: 'คุณภาพ & ผลสัมฤทธิ์' },
  { href: '/g4', Icon: Icons.G4, label: 'ความสอดคล้องเชิงยุทธศาสตร์' },
  { href: '/g5', Icon: Icons.G5, label: 'ความสัมพันธ์เชิงวิเคราะห์' },
];

export default function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { academicYear, semester } = useFilters();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects().then((res) => {
      setProjects(res.projects);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const projectCount = useMemo(() => {
    if (loading) return null;
    let list = projects;
    if (academicYear !== 'all') {
      list = list.filter((p) => String(p.academicYear) === academicYear);
    }
    if (semester !== 'all') {
      list = list.filter((p) => p.semester === semester);
    }
    return list.length;
  }, [projects, academicYear, semester, loading]);

  const academicYearLabel = useMemo(() => {
    const yearsWithData = academicYears(projects);
    if (!yearsWithData.length) return 'ปีการศึกษา 2567 - 2568';
    if (academicYear !== 'all') return `ปีการศึกษา ${academicYear}`;
    const min = Math.min(...yearsWithData);
    const max = Math.max(...yearsWithData);
    return min === max ? `ปีการศึกษา ${min}` : `ปีการศึกษา ${min} - ${max}`;
  }, [projects, academicYear]);

  return (
    <aside className={styles.sidebar} data-open={menuOpen}>
      <button className={styles.mobileToggle} aria-expanded={menuOpen} aria-controls="dashboard-navigation" onClick={() => setMenuOpen(open => !open)}>
        {menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'} · Executive Dashboard
      </button>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Image src="/kukps_logo180x180.png" alt="ระบบบริหารและวิเคราะห์กิจกรรมนิสิต" width={44} height={44} priority unoptimized />
        </div>
        <div className={styles.logoText}>
          <h1 className={styles.logoTitle}>Executive Dashboard</h1>
          <p className={styles.logoDept}>ภาควิชาวิศวกรรมคอมพิวเตอร์</p>
        </div>
      </div>

      <nav id="dashboard-navigation" className={styles.nav} aria-label="เมนูหลัก" onClick={(event) => { if ((event.target as HTMLElement).closest('a')) setMenuOpen(false); }} onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpen(false); }}>
        <div className={styles.navSectionLabel}>ภาพรวมผู้บริหาร</div>
        <Link
          href="/overview"
          className={`${styles.navItem} ${pathname === '/overview' ? styles.active : ''}`}
        >
          <span className={styles.navIcon}><Icons.Overview /></span>
          <span>ภาพรวมแดชบอร์ด</span>
        </Link>

        <div className={styles.navSectionLabel}>การวิเคราะห์มิติยุทธศาสตร์</div>
        {groupNavItems.map((item) => {
          const ItemIcon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              <span className={styles.navIcon}><ItemIcon /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className={styles.navSectionLabel}>ฐานข้อมูลและทะเบียน</div>
        <Link
          href="/projects"
          className={`${styles.navItem} ${pathname === '/projects' ? styles.active : ''}`}
        >
          <span className={styles.navIcon}><Icons.Projects /></span>
          <span>ทะเบียนโครงการทั้งหมด</span>
          <span className={styles.navBadge}>
            {projectCount !== null ? projectCount : '...'}
          </span>
        </Link>

        <Link
          href="/participants"
          className={`${styles.navItem} ${pathname === '/participants' ? styles.active : ''}`}
        >
          <span className={styles.navIcon}><Icons.Participants /></span>
          <span>สถิติการมีส่วนร่วมนิสิต</span>
        </Link>

        <div className={styles.navSectionLabel}>ระบบจัดการข้อมูล</div>
        <Link
          href="/data-entry"
          className={`${styles.navItem} ${pathname === '/data-entry' ? styles.active : ''}`}
        >
          <span className={styles.navIcon}><Icons.Database /></span>
          <span>นำเข้า & จัดการข้อมูล (ETL)</span>
        </Link>
      </nav>

      <div className={styles.footer}>
        <div className={styles.academicYear}>{academicYearLabel}</div>
        <div className={styles.updateRow}>
          <div className={styles.pulseDot} />
          <span>ระบบบริหารจัดการข้อมูล</span>
        </div>
      </div>
    </aside>
  );
}
