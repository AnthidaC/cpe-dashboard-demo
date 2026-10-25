'use client';
// app/projects/page.tsx — Executive Projects Directory (โครงการที่จัดเรียบร้อยแล้วทั้งหมด)

import { useState, useMemo, useEffect } from 'react';
import LoadError from '@/components/LoadError';
import Topbar from '@/components/Topbar';
import KpiCard from '@/components/KpiCard';
import DataTable from '@/components/DataTable';
import { ChartControlGroup } from '@/components/ChartControlGroup';
import { usePagination } from '@/components/Pagination';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import { getProjects } from '@/lib/db/dataService';
import { Project, typeColorMap, calculateQualitySummary } from '@/lib/mockData';
import { exportDashboardToExcel } from '@/lib/exportExcel';
import layoutStyles from '@/app/layout.module.css';
import styles from './page.module.css';
import { useFilters } from '@/lib/FilterContext';
import { palette, percentageBandColor } from '@/lib/chartHelpers';
import { ratioLabel, safeRatio } from '@/lib/reportUtils';

export default function ProjectsPage() {
  const [projectsData, setProjectsData] = useState<{ projects: Project[]; isLive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Global filters from context
  const { academicYear, semester } = useFilters();

  const [exportError, setExportError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sdgOnly, setSdgOnly] = useState(false);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'satisfaction' | 'budget' | 'participants' | 'evalRate'>('satisfaction');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    getProjects()
      .then((res) => {
        setProjectsData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
        setLoading(false);
      });
  }, [retryKey]);

  const projectsList = useMemo(() => {
    let list = projectsData?.projects ?? [];
    if (academicYear !== 'all') {
      list = list.filter((p) => String(p.academicYear) === academicYear);
    }
    if (semester !== 'all') {
      list = list.filter((p) => p.semester === semester);
    }
    return list;
  }, [projectsData, academicYear, semester]);

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    let result = [...projectsList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.lecturer.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      );
    }

    if (selectedType !== 'all') {
      result = result.filter((p) => p.type === selectedType);
    }

    if (sdgOnly) {
      result = result.filter((p) => p.sdgList.length > 0);
    }

    result.sort((a, b) => {
      if (sortBy === 'satisfaction') return b.satisfaction - a.satisfaction;
      if (sortBy === 'budget') return b.actual - a.actual;
      if (sortBy === 'participants') return b.participants - a.participants;
      if (sortBy === 'evalRate') return b.evalRate - a.evalRate;
      return 0;
    });

    return result;
  }, [searchQuery, selectedType, sdgOnly, sortBy, projectsList]);
  const { visible: visibleProjects, pagination: projectPagination } = usePagination(filteredProjects);

  // Aggregate Metrics (synced with active filters)
  const totalActualSum = useMemo(() => filteredProjects.reduce((s, p) => s + p.actual, 0), [filteredProjects]);
  const totalPartSum = useMemo(() => filteredProjects.reduce((s, p) => s + p.participants, 0), [filteredProjects]);
  
  const qualitySum = useMemo(() => {
    return calculateQualitySummary(filteredProjects);
  }, [filteredProjects]);

  const typeOptions = useMemo(() => {
    const standardTypes = [
      { value: 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์', label: 'กิจกรรมวิชาการ/บัณฑิต' },
      { value: 'กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม', label: 'กิจกรรมคุณธรรมจริยธรรม' },
      { value: 'กิจกรรมกีฬาหรือส่งเสริมสุขภาพ', label: 'กิจกรรมกีฬา/สุขภาพ' },
      { value: 'กิจกรรมบำเพ็ญประโยชน์', label: 'กิจกรรมบำเพ็ญประโยชน์' },
      { value: 'กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม', label: 'กิจกรรมศิลปวัฒนธรรม' },
      { value: 'กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม', label: 'กิจกรรมสิ่งแวดล้อม' },
      { value: 'พัฒนาหลักสูตร', label: 'พัฒนาหลักสูตร' },
    ];
    const existing = new Set((projectsData?.projects ?? []).map(p => p.type));
    const filtered = standardTypes.filter(t => existing.has(t.value as Project['type']));
    return filtered.length > 0 ? filtered : standardTypes;
  }, [projectsData]);

  const shortTypeLabel = (type: string) => {
    if (type === 'กิจกรรมวิชาการที่ส่งเสริมคุณลักษณะบัณฑิตที่พึงประสงค์') return 'กิจกรรมวิชาการ';
    if (type === 'กิจกรรมเสริมสร้างคุณธรรมและจริยธรรม') return 'คุณธรรมจริยธรรม';
    if (type === 'กิจกรรมกีฬาหรือส่งเสริมสุขภาพ') return 'กีฬา/สุขภาพ';
    if (type === 'กิจกรรมบำเพ็ญประโยชน์') return 'บำเพ็ญประโยชน์';
    if (type === 'กิจกรรมเสริมสร้างศิลปะและวัฒนธรรม') return 'ศิลปวัฒนธรรม';
    if (type === 'กิจกรรมส่งเสริมการรักษาสิ่งแวดล้อม') return 'สิ่งแวดล้อม';
    return type || 'พัฒนาหลักสูตร';
  };

  if (loading) {
    return (
      <>
      {exportError && <div role="alert">ส่งออกไม่สำเร็จ กรุณาลองอีกครั้ง <button onClick={() => setExportError(false)}>ปิด</button></div>}
        <Topbar title="ทะเบียนโครงการภาควิชา" subtitle="กำลังเชื่อมต่อและโหลดข้อมูลโครงการ..." />
        <div className={layoutStyles.content} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E2E8F0', borderTop: '4px solid var(--color-primary, #1E61F0)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
          <p style={{ fontSize: '15px', color: '#475569', fontFamily: 'Sarabun, sans-serif' }}>กำลังเชื่อมต่อฐานข้อมูล...</p>
        </div>
      </>
    );
  }

  if (loadError) return <LoadError onRetry={() => { setLoadError(false); setLoading(true); setRetryKey(key => key + 1); }} />;

  return (
    <>
      <Topbar
        exportProjects={filteredProjects}
        title="ทะเบียนโครงการภาควิชา"
        subtitle={`สืบค้น รายละเอียดงบประมาณ ผู้เข้าร่วม และผลสัมฤทธิ์รายโครงการ ปีการศึกษา ${academicYear === 'all' ? 'ทุกปี' : academicYear}${semester !== 'all' ? ` (${semester === 't1' ? 'ภาคเรียนที่ 1' : semester === 't2' ? 'ภาคเรียนที่ 2' : 'ภาคฤดูร้อน'})` : ''}`}
      />
      <div className={layoutStyles.content}>

        {/* Summary KPI Cards */}
        <div className={layoutStyles.kpiRow}>
          <KpiCard label="โครงการทั้งหมด" value={`${filteredProjects.length}`} sub="โครงการ" color="emerald" />
          <KpiCard label="งบประมาณใช้จริงรวม" value={`฿${totalActualSum.toLocaleString()}`} sub="บาท" color="amber" />
          <KpiCard label="ผู้เข้าร่วมสะสม" value={`${totalPartSum.toLocaleString()}`} sub="คน-ครั้ง (อาจนับคนซ้ำข้ามโครงการ)" color="blue" />
          <KpiCard
            label="ความพึงพอใจเฉลี่ย"
            value={qualitySum.avgSatisfaction > 0 ? qualitySum.avgSatisfaction.toFixed(2) : '-'}
            sub={qualitySum.avgSatisfaction > 0 ? 'จากเต็ม 5.00 คะแนน' : 'ยังไม่มีผลประเมิน'}
            color="purple"
          />
        </div>

        {/* Controls Bar */}
        <div className={styles.controlsCard}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อโครงการ ผู้ดูแล หรือรหัส..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button className={styles.clearSearch} onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <div className={styles.filterGroup}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={styles.selectInput}
              title="เลือกหมวดหมู่กิจกรรม"
            >
              <option value="all">ทุกประเภทกิจกรรม</option>
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as never)}
              className={styles.selectInput}
              title="เรียงลำดับตาม"
            >
              <option value="satisfaction">เรียงตาม: ความพึงพอใจสูงสุด</option>
              <option value="budget">เรียงตาม: งบประมาณใช้จริง</option>
              <option value="participants">เรียงตาม: จำนวนผู้เข้าร่วม</option>
              <option value="evalRate">เรียงตาม: อัตราการตอบแบบประเมิน</option>
            </select>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={sdgOnly}
                onChange={(e) => setSdgOnly(e.target.checked)}
              />
              เฉพาะโครงการตอบ SDGs
            </label>
          </div>
        </div>

        {/* Results Counter & Quick Export */}
        <div className={styles.resultsMeta}>
          <ChartControlGroup<'cards' | 'table'> label="มุมมอง:" value={view} onChange={setView}
            options={[{ value: 'cards', label: 'การ์ด' }, { value: 'table', label: 'ตาราง' }]} />
          <div>
            <span>พบ <strong>{filteredProjects.length}</strong> โครงการ</span>
            {filteredProjects.length === 0 && <span className={styles.noResults}>ไม่พบข้อมูลตามเงื่อนไขค้นหา</span>}
          </div>

          {filteredProjects.length > 0 && (
            <button
              type="button"
              className={styles.exportTableBtn}
              onClick={() => { exportDashboardToExcel(filteredProjects, { academicYear, semester, exportType: 'projects-only' }).catch(() => setExportError(true)); }}
              title="ดาวน์โหลดเฉพาะโครงการที่แสดงในรายการนี้เป็นไฟล์ Excel (.xlsx)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>ส่งออกรายการที่เลือก (.xlsx)</span>
            </button>
          )}
        </div>

        {/* Projects Grid */}
        {view === 'table' ? <DataTable projects={filteredProjects} onRowClick={setSelectedProject} /> : <>
        <div className={styles.projectGrid}>
          {visibleProjects.map((p) => {
            const utilRate = safeRatio(p.actual, p.budget);
            const costPerHead = safeRatio(p.actual, p.participants);

            return (
              <div
                key={p.id}
                className={styles.projectCard}
                onClick={() => setSelectedProject(p)}
              >
                <div className={styles.cardHeader}>
                  <span
                    className={styles.typeBadge}
                    style={{
                      color: typeColorMap[p.type] ?? palette.blue,
                      borderColor: typeColorMap[p.type] ?? palette.blue,
                    }}
                  >
                    {shortTypeLabel(p.type)}
                  </span>
                  <span className={styles.projectId}>#{p.id}</span>
                </div>

                <h3 className={styles.cardTitle} title={p.name}>{p.name}</h3>
                
                <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500, marginBottom: '12px' }}>
                  ผู้ดูแล: {p.lecturer}
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <div className={styles.statLabel}>ความพึงพอใจ</div>
                    <div className={styles.statVal} style={{ color: p.satisfaction > 0 ? '#7C3AED' : '#94A3B8' }}>
                      {p.satisfaction > 0 ? `${p.satisfaction.toFixed(2)} / 5.00` : '-'}
                    </div>
                  </div>

                  <div className={styles.statBox}>
                    <div className={styles.statLabel}>ผู้เข้าร่วม</div>
                    <div className={styles.statVal} style={{ color: '#1E40AF' }}>
                      {p.participants} คน
                    </div>
                  </div>

                  <div className={styles.statBox}>
                    <div className={styles.statLabel}>ใช้จริง</div>
                    <div className={styles.statVal} style={{ color: 'var(--ku-green)' }}>
                      ฿{(p.actual / 1000).toFixed(1)}K
                    </div>
                  </div>

                  <div className={styles.statBox}>
                    <div className={styles.statLabel}>Cost / คน</div>
                    <div className={styles.statVal} style={{ color: '#D97706' }}>
                      {costPerHead === null ? ratioLabel(p.actual, p.participants) : `฿${ratioLabel(p.actual, p.participants)}`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={styles.progressContainer}>
                  <div className={styles.progressHeader}>
                    <span>เบิกจ่ายงบ ({ratioLabel(p.actual, p.budget, true)})</span>
                    <span>฿{Math.round(p.actual).toLocaleString()} / ฿{Math.round(p.budget).toLocaleString()}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.max(0, Math.min((utilRate ?? 0) * 100, 100))}%`,
                        backgroundColor: utilRate !== null ? percentageBandColor(utilRate * 100) : '#CBD5E1',
                      }}
                    />
                  </div>
                </div>

                {/* Footer Tag Badges */}
                <div className={styles.tagRow}>
                  {p.sdgList.length > 0 && <span className={styles.sdgBadge}>SDGs: {p.sdgList.join(', ')}</span>}
                  {p.strategySubs.includes(3) && <span className={styles.s3Badge}>ยุทธศาสตร์ 1 กลยุทธ์ 3</span>}
                  {p.kuList.length > 0 && <span className={styles.kuBadge}>IDKU: {p.kuList.join('-')}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {projectPagination}
        </>}

        {/* Project Detail Modal */}
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />

      </div>
    </>
  );
}
