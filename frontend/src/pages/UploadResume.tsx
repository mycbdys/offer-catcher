import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { matchesApi } from "../api/matches";
import { useAuthStore } from "../stores/authStore";

// ──── Types ────
interface ResumeForm {
  name: string; phone: string; email: string;
  gender: string; birth_year: number; political_status: string;
  school: string; degree: string; major: string; minor: string;
  gpa: string; ranking: string; edu_start: string; edu_end: string;
  skills: string[];
  expected_city: string; expected_position: string;
  expected_salary_min: number; expected_salary_max: number;
  expected_industry: string; job_type: string;
  internships: Record<string, string>[];
  projects: Record<string, string>[];
  certificates: string[];
  languages: {language: string; level: string; score: string}[];
  awards: string[];
  self_evaluation: string;
}

const EMPTY: ResumeForm = {
  name: "", phone: "", email: "", gender: "", birth_year: 0, political_status: "",
  school: "", degree: "", major: "", minor: "", gpa: "", ranking: "", edu_start: "", edu_end: "",
  skills: [], expected_city: "", expected_position: "", expected_salary_min: 0, expected_salary_max: 0,
  expected_industry: "", job_type: "全职",
  internships: [], projects: [], certificates: [], languages: [], awards: [], self_evaluation: "",
};

const SKILLS = [
  "Python", "Java", "C++", "Go", "Rust", "JavaScript", "TypeScript", "React", "Vue", "Angular",
  "Node.js", "Next.js", "Spring Boot", "Django", "Flask", "FastAPI", "MySQL", "PostgreSQL",
  "MongoDB", "Redis", "Docker", "Kubernetes", "Linux", "Git", "AWS", "Azure", "CI/CD",
  "机器学习", "深度学习", "NLP", "计算机视觉", "数据分析", "SQL", "HTML", "CSS",
  "TensorFlow", "PyTorch", "Spark", "Hadoop", "Figma", "MATLAB", "Office", "Excel", "PPT",
];
const YEARS = Array.from({length: 2026 - 1900 + 1}, (_, i) => 1900 + i).reverse();
const DEGREES = ["大专", "本科", "硕士", "博士"];

function flatten(data: Record<string, unknown>): ResumeForm {
  const p = (data?.personal || {}) as Record<string, unknown>;
  const edu = ((data?.education || []) as Record<string, unknown>[])[0] || {};
  const prefs = (data?.preferences || {}) as Record<string, unknown>;
  const pos = (prefs.expected_positions as string[]) || [];
  return {
    name: (p.name||"") as string, phone: (p.phone||"") as string, email: (p.email||"") as string,
    gender: (p.gender||"") as string, birth_year: (p.birth_year||0) as number, political_status: (p.political_status||"") as string,
    school: (edu.school||"") as string, degree: (edu.degree||"") as string, major: (edu.major||"") as string, minor: (edu.minor||"") as string,
    gpa: (edu.gpa||"") as string, ranking: (edu.ranking||"") as string, edu_start: (edu.start||"") as string, edu_end: (edu.end||"") as string,
    skills: (data?.skills||[]) as string[],
    expected_city: (prefs.expected_city||"") as string, expected_position: pos[0] || (prefs.expected_position||"") as string,
    expected_salary_min: (prefs.expected_salary_min||0) as number, expected_salary_max: (prefs.expected_salary_max||0) as number,
    expected_industry: (prefs.expected_industry||"") as string, job_type: (prefs.job_type||"全职") as string,
    internships: (data?.internships||[]) as Record<string, string>[],
    projects: (data?.projects||[]) as Record<string, string>[],
    certificates: (data?.certificates||[]) as string[],
    languages: (data?.languages||[]) as {language:string;level:string;score:string}[],
    awards: (data?.awards||[]) as string[],
    self_evaluation: (data?.self_evaluation||"") as string,
  };
}

// ──── Components ────
function Label({ children, required }: {children: React.ReactNode; required?: boolean}) {
  return <label className="block text-sm font-medium text-slate-700 mb-2">{children}{required && <span className="text-red-400 ml-1">*</span>}</label>;
}

function Field({ label, required, children }: {label: string; required?: boolean; children: React.ReactNode}) {
  return <div className="flex-1 min-w-[200px]"><Label required={required}>{label}</Label>{children}</div>;
}

function Input({ value, onChange, placeholder = "", type = "text", suffix = "" }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400" />
      {suffix && <span className="text-sm text-slate-400 shrink-0">{suffix}</span>}
    </div>
  );
}

function Select({ value, onChange, options }: {value: string; onChange: (v: string) => void; options: string[]}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
      <option value="">请选择</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function YearPicker({ value, onChange }: {value: number; onChange: (v: number) => void}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  const disp = value ? `${value} 年` : "请选择";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm text-left transition ${
          open ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-300 hover:border-slate-400"
        } ${value ? "text-slate-900" : "text-slate-400"}`}>
        {disp} <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▼</span>
      </button>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {YEARS.map(y => (
            <button key={y} type="button"
              onClick={() => { onChange(y); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition ${
                y === value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"
              }`}>
              {y} 年
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Autocomplete({ value, onChange, endpoint, placeholder = "" }: {
  value: string; onChange: (v: string) => void; endpoint: "schools"|"majors"|"cities"; placeholder?: string;
}) {
  const [results, setResults] = useState<{label:string;sub?:string}[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  function search(q: string) {
    onChange(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete/${endpoint}?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setResults(endpoint === "schools"
          ? data.map((s: {name:string;tier:string;city:string}) => ({label:s.name, sub:`${s.tier} · ${s.city}`}))
          : endpoint === "cities"
          ? data.map((c: string, i: number) => ({label:c, sub: i < 20 ? "热门" : ""}))
          : data.map((m: string) => ({label:m})));
        if (data.length > 0) setOpen(true);
      } catch { setResults([]); }
      setLoading(false);
    }, 200);
  }

  return (
    <div ref={ref} className="relative">
      <input value={value} onChange={e => search(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400" />
      {loading && <div className="absolute right-3 top-3"><div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}
      {open && results.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} type="button" onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(r.label); setOpen(false); setResults([]); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition flex justify-between">
              <span className="text-slate-700">{r.label}</span>
              {r.sub && <span className="text-xs text-slate-400">{r.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TagInput({ value, onChange }: {value: string[]; onChange: (v: string[]) => void}) {
  const [input, setInput] = useState("");
  const [show, setShow] = useState(false);

  const add = (t: string) => { const c = t.trim(); if (c && !value.includes(c)) onChange([...value, c]); setInput(""); };
  const remove = (t: string) => onChange(value.filter(s => s !== t));
  const filtered = SKILLS.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s));

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
            {t}<button onClick={() => remove(t)} className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
          </span>
        ))}
      </div>
      <input value={input} onChange={e => { setInput(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 150)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
        placeholder="输入技能后按回车添加" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
      {show && input && filtered.length > 0 && (
        <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(s => (
            <button key={s} type="button" onMouseDown={e => e.preventDefault()} onClick={() => add(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition">{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpCard({ item, onChange, onRemove, fields }: {
  item: Record<string,string>; onChange: (item: Record<string,string>) => void; onRemove: () => void;
  fields: {key:string; label:string; type?:string; placeholder?:string}[];
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 relative">
      <button onClick={onRemove} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 text-lg">×</button>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fields.map(f => (
          <div key={f.key} className={f.type === "textarea" ? "col-span-full" : ""}>
            <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea value={item[f.key]||""} onChange={e => onChange({...item, [f.key]:e.target.value})} rows={3}
                placeholder={f.placeholder} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-y" />
            ) : (
              <input value={item[f.key]||""} onChange={e => onChange({...item, [f.key]:e.target.value})}
                placeholder={f.placeholder} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Progress bar ────
const STEPS = [
  { key: "upload", label: "上传简历" },
  { key: "basic", label: "基本信息" },
  { key: "edu", label: "教育背景" },
  { key: "skills", label: "技能意向" },
  { key: "exp", label: "经历" },
  { key: "more", label: "更多信息" },
  { key: "review", label: "确认提交" },
];

function Progress({ current }: {current: string}) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1 shrink-0">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            i < idx ? "bg-emerald-50 text-emerald-700" :
            i === idx ? "bg-blue-600 text-white" :
            "bg-slate-100 text-slate-400"
          }`}>
            {i < idx ? "✓" : <span className="w-4 text-center text-xs">{i+1}</span>}
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < STEPS.length-1 && <div className={`w-4 h-0.5 ${i < idx ? "bg-emerald-400" : "bg-slate-200"}`} />}
        </div>
      ))}
    </div>
  );
}

// ──── Main Page ────
export default function UploadResume() {
  const [step, setStep] = useState("upload");
  const [form, setForm] = useState(EMPTY);
  const [resumeId, setResumeId] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // ── Check required per step ──
  const canBasic = form.name && form.email;
  const canEdu = canBasic && form.school && form.degree && form.major;
  const canSkills = canEdu && form.skills.length > 0 && form.expected_city && form.expected_position;

  // ── File upload ──
  async function handleFile(file: File) {
    setError(""); setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const token = api.getToken();
      const res = await fetch("/api/resumes/upload", {method:"POST", headers:token?{Authorization:`Bearer ${token}`}:{}, body:fd});
      if (!res.ok) throw new Error((await res.json()).detail || "上传失败");
      const data = await res.json();
      setResumeId(data.id);
      if (data.parsed_data && Object.keys(data.parsed_data).length > 0) {
        setForm(flatten(data.parsed_data));
      }
      setStep("basic");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "上传失败"); }
    setUploading(false);
  }

  // ── Save & match ──
  async function saveAndMatch() {
    if (!resumeId) return;
    setMatching(true);
    try {
      const token = api.getToken();
      await fetch(`/api/resumes/${resumeId}`, {method:"PUT", headers:{"Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{})}, body: JSON.stringify({
        parsed_data: {
          personal: {name:form.name, phone:form.phone, email:form.email, gender:form.gender, birth_year:form.birth_year, political_status:form.political_status},
          education: [{school:form.school, degree:form.degree, major:form.major, minor:form.minor, gpa:form.gpa, ranking:form.ranking, start:form.edu_start, end:form.edu_end}],
          skills: form.skills, internships: form.internships, projects: form.projects,
          preferences: {expected_city:form.expected_city, expected_positions:[form.expected_position], expected_salary_min:form.expected_salary_min, expected_salary_max:form.expected_salary_max, expected_industry:form.expected_industry, job_type:form.job_type},
          certificates: form.certificates, languages: form.languages, awards: form.awards, self_evaluation: form.self_evaluation,
        },
        skills: form.skills,
        job_preferences: {city:form.expected_city, positions:[form.expected_position], salary_min:form.expected_salary_min, salary_max:form.expected_salary_max, industry:form.expected_industry, job_type:form.job_type},
      })});
    } catch {}
    try {
      const {session_id} = await matchesApi.start(resumeId);
      navigate(`/match/${session_id}`);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "匹配失败"); setMatching(false); }
  }

  // ── Quick fill from raw text ──
  async function quickFill() {
    setError("");
    const token = api.getToken();
    const raw = `姓名:${form.name}\n手机:${form.phone}\n邮箱:${form.email}\n学校:${form.school}\n学历:${form.degree}\n专业:${form.major}\n期望城市:${form.expected_city}\n期望职位:${form.expected_position}\n技能:${form.skills.join(",")}\n期望薪资:${form.expected_salary_min}-${form.expected_salary_max}`;
    try {
      const r = await fetch("/api/resumes", {method:"POST", headers:{"Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{})}, body:JSON.stringify({raw_text:raw, file_name:"手动填写"})});
      if (!r.ok) throw new Error((await r.json()).detail);
      setResumeId((await r.json()).id);
      setStep("basic");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "提交失败"); }
  }

  // ── Render helpers ──
  const S = (k: keyof ResumeForm, v: unknown) => setForm({...form, [k]: v});

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600">Offer 捕手</Link>
          <div className="flex items-center gap-5 text-sm">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-700">个人中心</Link>
            <span className="text-slate-400">{user?.nickname || user?.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

        {step !== "upload" && <Progress current={step} />}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10">

          {/* ════ Upload ════ */}
          {step === "upload" && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">完善你的简历信息</h2>
                <p className="text-slate-500">上传简历文件自动解析，或直接手动填写</p>
              </div>

              {/* Upload zone */}
              <div onDragOver={e => {e.preventDefault(); setDragOver(true);}} onDragLeave={() => setDragOver(false)}
                onDrop={e => {e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f);}}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                  dragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50/50 hover:border-blue-300 hover:bg-slate-50"}`}>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
                  onChange={e => {const f = e.target.files?.[0]; if (f) handleFile(f);}} />
                {uploading ? (
                  <div>
                    <div className="animate-spin w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">正在解析文件...</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-slate-700 font-semibold text-lg mb-1">点击或拖拽上传简历</p>
                    <p className="text-slate-400 text-sm">支持 PDF / DOCX / TXT，最大 10MB</p>
                  </div>
                )}
              </div>

              {/* Quick start */}
              <div className="border-t border-slate-100 pt-6">
                <p className="text-sm text-slate-500 mb-4 text-center">或先填写核心信息快速开始</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
                  <Field label="姓名" required><Input value={form.name} onChange={v => S("name", v)} /></Field>
                  <Field label="手机号" required><Input value={form.phone} onChange={v => S("phone", v)} /></Field>
                  <Field label="邮箱" required><Input value={form.email} onChange={v => S("email", v)} /></Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-4">
                  <Field label="学校" required><Autocomplete value={form.school} onChange={v => S("school", v)} endpoint="schools" /></Field>
                  <Field label="学历" required><Select value={form.degree} onChange={v => S("degree", v)} options={DEGREES} /></Field>
                  <Field label="专业" required><Autocomplete value={form.major} onChange={v => S("major", v)} endpoint="majors" /></Field>
                  <Field label="出生年份"><YearPicker value={form.birth_year} onChange={v => S("birth_year", v)} /></Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
                  <Field label="期望城市" required><Autocomplete value={form.expected_city} onChange={v => S("expected_city", v)} endpoint="cities" placeholder="搜索城市" /></Field>
                  <Field label="期望职位" required><Input value={form.expected_position} onChange={v => S("expected_position", v)} placeholder="如 后端开发工程师" /></Field>
                  <Field label="工作类型"><Select value={form.job_type} onChange={v => S("job_type", v)} options={["全职", "实习"]} /></Field>
                </div>
                <Field label="技能标签" required><TagInput value={form.skills} onChange={v => S("skills", v)} /></Field>
                <button onClick={quickFill} disabled={!canSkills}
                  className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium">
                  开始完善信息
                </button>
              </div>
            </div>
          )}

          {/* ════ Basic Info ════ */}
          {step === "basic" && (
            <div className="space-y-8">
              <h3 className="text-lg font-bold text-slate-900">基本信息</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Field label="姓名" required><Input value={form.name} onChange={v => S("name", v)} /></Field>
                <Field label="手机号" required><Input value={form.phone} onChange={v => S("phone", v)} /></Field>
                <Field label="邮箱" required><Input value={form.email} onChange={v => S("email", v)} /></Field>
                <Field label="性别"><Select value={form.gender} onChange={v => S("gender", v)} options={["男", "女"]} /></Field>
                <Field label="出生年份"><YearPicker value={form.birth_year} onChange={v => S("birth_year", v)} /></Field>
                <Field label="政治面貌"><Select value={form.political_status} onChange={v => S("political_status", v)} options={["中共党员", "预备党员", "共青团员", "群众"]} /></Field>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep("upload")} className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition">上一步</button>
                <button onClick={() => setStep("edu")} disabled={!canBasic}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition ml-auto">下一步</button>
              </div>
            </div>
          )}

          {/* ════ Education ════ */}
          {step === "edu" && (
            <div className="space-y-8">
              <h3 className="text-lg font-bold text-slate-900">教育背景</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Field label="学校" required><Autocomplete value={form.school} onChange={v => S("school", v)} endpoint="schools" /></Field>
                <Field label="学历" required><Select value={form.degree} onChange={v => S("degree", v)} options={DEGREES} /></Field>
                <Field label="专业" required><Autocomplete value={form.major} onChange={v => S("major", v)} endpoint="majors" /></Field>
                <Field label="辅修"><Autocomplete value={form.minor} onChange={v => S("minor", v)} endpoint="majors" /></Field>
                <Field label="GPA"><Input value={form.gpa} onChange={v => S("gpa", v)} placeholder="如 3.8/4.0" /></Field>
                <Field label="排名"><Input value={form.ranking} onChange={v => S("ranking", v)} placeholder="如 前10%" /></Field>
                <Field label="入学时间"><Input value={form.edu_start} onChange={v => S("edu_start", v)} placeholder="YYYY-MM" /></Field>
                <Field label="毕业时间"><Input value={form.edu_end} onChange={v => S("edu_end", v)} placeholder="YYYY-MM" /></Field>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep("basic")} className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition">上一步</button>
                <button onClick={() => setStep("skills")} disabled={!canEdu}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition ml-auto">下一步</button>
              </div>
            </div>
          )}

          {/* ════ Skills & Preferences ════ */}
          {step === "skills" && (
            <div className="space-y-8">
              <h3 className="text-lg font-bold text-slate-900">技能与求职意向</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <Field label="技能标签" required><TagInput value={form.skills} onChange={v => S("skills", v)} /></Field>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Field label="期望城市" required><Autocomplete value={form.expected_city} onChange={v => S("expected_city", v)} endpoint="cities" placeholder="搜索城市" /></Field>
                <Field label="期望职位" required><Input value={form.expected_position} onChange={v => S("expected_position", v)} placeholder="如 后端开发工程师" /></Field>
                <Field label="工作类型" required><Select value={form.job_type} onChange={v => S("job_type", v)} options={["全职", "实习"]} /></Field>
                <Field label="期望行业"><Input value={form.expected_industry} onChange={v => S("expected_industry", v)} placeholder="如 互联网、金融" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <Field label="最低薪资"><Input value={form.expected_salary_min||""} onChange={v => S("expected_salary_min", Number(v)||0)} type="number" suffix="元/月" /></Field>
                <Field label="最高薪资"><Input value={form.expected_salary_max||""} onChange={v => S("expected_salary_max", Number(v)||0)} type="number" suffix="元/月" /></Field>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep("edu")} className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition">上一步</button>
                <button onClick={() => setStep("exp")} disabled={!canSkills}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition ml-auto">下一步</button>
              </div>
            </div>
          )}

          {/* ════ Experience ════ */}
          {step === "exp" && (
            <div className="space-y-10">
              {/* Internships */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">实习经历</h3>
                  <button onClick={() => S("internships", [...form.internships, {}])}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ 添加实习经历</button>
                </div>
                {form.internships.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">暂无，点击上方按钮添加</p>}
                {form.internships.map((item, i) => (
                  <ExpCard key={i} item={item}
                    onChange={v => {const c=[...form.internships];c[i]=v;S("internships",c);}}
                    onRemove={() => S("internships", form.internships.filter((_,j) => j!==i))}
                    fields={[
                      {key:"company", label:"公司名称", placeholder:"如 字节跳动"},
                      {key:"position", label:"职位", placeholder:"如 后端开发实习生"},
                      {key:"start", label:"开始时间", placeholder:"YYYY-MM"},
                      {key:"end", label:"结束时间", placeholder:"YYYY-MM"},
                      {key:"description", label:"工作内容", type:"textarea", placeholder:"描述你的主要工作和成果，如：使用Python开发XX系统，日处理数据量XX，性能提升XX%"},
                    ]} />
                ))}
              </div>

              {/* Projects */}
              <div className="border-t pt-10 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">项目经历</h3>
                  <button onClick={() => S("projects", [...form.projects, {}])}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ 添加项目经历</button>
                </div>
                {form.projects.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">暂无，点击上方按钮添加</p>}
                {form.projects.map((item, i) => (
                  <ExpCard key={i} item={item}
                    onChange={v => {const c=[...form.projects];c[i]=v;S("projects",c);}}
                    onRemove={() => S("projects", form.projects.filter((_,j) => j!==i))}
                    fields={[
                      {key:"name", label:"项目名称", placeholder:"如 校园二手交易平台"},
                      {key:"role", label:"担任角色", placeholder:"如 后端负责人"},
                      {key:"description", label:"项目描述", type:"textarea", placeholder:"描述项目背景、技术栈、你的贡献和成果"},
                    ]} />
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep("skills")} className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition">上一步</button>
                <button onClick={() => setStep("more")}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition ml-auto">下一步</button>
              </div>
            </div>
          )}

          {/* ════ More Info ════ */}
          {step === "more" && (
            <div className="space-y-8">
              <h3 className="text-lg font-bold text-slate-900">更多信息</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>证书</Label>
                  <textarea value={form.certificates.join("\n")}
                    onChange={e => S("certificates", e.target.value.split("\n").filter(Boolean))}
                    placeholder="每行一个，如：&#10;CET-6 (580分)&#10;计算机二级&#10;教师资格证"
                    rows={4} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y" />
                </div>
                <div>
                  <Label>语言能力</Label>
                  {form.languages.map((l, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={l.language} onChange={e => {const c=[...form.languages];c[i]={...c[i],language:e.target.value};S("languages",c);}}
                        placeholder="语言" className="flex-1 px-2 py-2 border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                      <input value={l.level} onChange={e => {const c=[...form.languages];c[i]={...c[i],level:e.target.value};S("languages",c);}}
                        placeholder="等级" className="w-24 px-2 py-2 border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                      <button onClick={() => S("languages", form.languages.filter((_,j)=>j!==i))} className="text-slate-300 hover:text-red-500">×</button>
                    </div>
                  ))}
                  <button onClick={() => S("languages", [...form.languages, {language:"",level:"",score:""}])}
                    className="text-sm text-blue-600 hover:text-blue-700">+ 添加语言</button>
                </div>
              </div>

              <div>
                <Label>获奖情况</Label>
                <textarea value={form.awards.join("\n")}
                  onChange={e => S("awards", e.target.value.split("\n").filter(Boolean))}
                  placeholder="每行一个，如：&#10;国家奖学金&#10;ACM程序设计竞赛省一等奖&#10;校优秀学生干部"
                  rows={3} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y" />
              </div>

              <div>
                <Label>自我评价</Label>
                <textarea value={form.self_evaluation}
                  onChange={e => S("self_evaluation", e.target.value)}
                  placeholder="简要描述你的技术优势、个人特点、职业规划等（200字以内）"
                  rows={4} maxLength={500}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y" />
                <p className="text-xs text-slate-400 mt-1 text-right">{form.self_evaluation.length}/500</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep("exp")} className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition">上一步</button>
                <button onClick={() => setStep("review")}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition ml-auto">下一步</button>
              </div>
            </div>
          )}

          {/* ════ Review ════ */}
          {step === "review" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900">确认信息</h3>
              <p className="text-sm text-slate-500">请核对以下信息，确认无误后提交</p>

              {[
                {title:"基本信息", fields:[
                  ["姓名",form.name],["手机",form.phone],["邮箱",form.email],
                  ["性别",form.gender||"未填写"],["出生年份",form.birth_year?`${form.birth_year}年`:"未填写"],["政治面貌",form.political_status||"未填写"],
                ]},
                {title:"教育背景", fields:[
                  ["学校",form.school],["学历",form.degree],["专业",form.major],
                  ["辅修",form.minor||"无"],["GPA",form.gpa||"未填写"],["排名",form.ranking||"未填写"],
                  ["入学",form.edu_start||"未填写"],["毕业",form.edu_end||"未填写"],
                ]},
                {title:"技能意向", fields:[
                  ["技能",form.skills.join("、")||"无"],
                  ["期望城市",form.expected_city],["期望职位",form.expected_position],
                  ["类型",form.job_type],["薪资",form.expected_salary_min&&form.expected_salary_max?`${form.expected_salary_min}-${form.expected_salary_max}元/月`:"未填写"],
                ]},
                {title:"实习经历", fields: form.internships.length > 0 ? form.internships.map(i => [i.company||"未填写", `${i.position||""} (${i.start||""}-${i.end||""})`]) : [["无",""]]},
                {title:"项目经历", fields: form.projects.length > 0 ? form.projects.map(p => [p.name||"未填写", p.role||""]) : [["无",""]]},
              ].map(s => (
                <div key={s.title} className="border border-slate-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">{s.title}</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {s.fields.map(([k, v], i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-400">{k}</span>
                        <span className={`font-medium ${v==="未填写"||v==="无"?"text-slate-300":"text-slate-700"}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-4 items-center">
                <button onClick={() => setStep("more")} className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition">上一步</button>
                <div className="text-sm text-slate-500 ml-auto">
                  {canSkills ? <span className="text-emerald-600">✓ 必填项已完成</span> : <span className="text-amber-600">⚠ 请完善必填项</span>}
                </div>
                <button onClick={saveAndMatch} disabled={!canSkills || matching}
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {matching ? "提交中..." : "提交并开始匹配"}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
