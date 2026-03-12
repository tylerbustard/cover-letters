import { assets } from './assets'
import type { ResumeTemplate, ResumeExperienceItem, ResumeExperienceGroup, ResumeLeadershipGroup } from '@/types'

const baseSummary =
  'Driving innovation at the intersection of finance and technology while delivering exceptional results through analytical expertise, strategic thinking, and client-focused solutions.'

const baseHeader = (email: string, website: string) => ({
  name: 'Tyler Bustard',
  title: 'Finance & Technology Professional',
  summary: baseSummary,
  profileSrc: assets.profileTyler,
  profileAlt: 'Tyler Bustard portrait',
  contact: {
    email,
    phone: '+1 (613) 985-1223',
    website,
    location: 'Toronto, Ontario',
  },
})

const createUnbEducation = () => ({
  id: 'education-unb',
  degree: 'Bachelor of Business Administration',
  program: 'Major in Finance',
  school: 'University of New Brunswick',
  date: '2016-2020',
  bullets: [
    'Analyst and Portfolio Manager - University of New Brunswick Student Investment Fund',
    'Member of UNB Finance Club, Royal Bank of Canada Student Ambassador, Accredited Co-op Program',
    'Recipient of 5 Scholarship for academic merit and leadership skills, Total $47,500',
  ],
  logoSrc: assets.logoUnbFull,
  logoAlt: 'University of New Brunswick',
})

const createStringsExperience = (): ResumeExperienceItem => ({
  id: 'experience-73strings',
  role: 'Senior Associate, Portfolio Monitoring',
  company: '73 Strings',
  location: 'Toronto, ON',
  date: '2025-Present',
  bullets: [
    'Monitor daily NAV inputs, validate holdings and cash flows; support accurate fund valuations',
    'Review reconciliation workflows, investigate exceptions, and liaise with operations risk and PMs',
  ],
  skills: ['Monitoring Controls', 'Reconciliation', 'NAV Validation', 'SQL', 'Excel'],
  logoSrc: assets.logo73Strings,
  logoAlt: '73 Strings',
})

const createFiscalExperience = (): ResumeExperienceItem => ({
  id: 'experience-fiscal',
  role: 'Equity Analyst',
  company: 'Fiscal.ai',
  location: 'Toronto, ON',
  date: '2023-2025',
  bullets: [
    'Analyzed and compiled public company financial statements, cutting reporting turnaround by 13%',
    'Collaborated with product and engineering to implement AI-driven data features, boosting adoption by 12%',
  ],
  skills: ['Financial Analysis', 'AI Integration', 'Data Analytics', 'Python', 'SQL'],
  logoSrc: assets.logoFiscalAi,
  logoAlt: 'Fiscal.ai',
})

const createBmoExperience = (date: string): ResumeExperienceItem => ({
  id: 'experience-bmo',
  role: 'Portfolio Assistant',
  company: 'BMO Private Wealth',
  location: 'Toronto, ON',
  date,
  bullets: [
    'Advised Investment Counsellors managing $100M+ AUM, reducing preparation time by 12%',
    'Bolstered client communications, boosting response rates by 9%, heightening client satisfaction and retention',
  ],
  skills: ['Portfolio Management', 'Client Relations', 'Financial Analysis', 'Excel'],
  logoSrc: assets.logoBmo,
  logoAlt: 'BMO',
})

const createTdExperience = (): ResumeExperienceItem => ({
  id: 'experience-td',
  role: 'Financial Advisor',
  company: 'TD Canada Trust',
  location: 'Kingston, ON',
  date: '2021-2022',
  bullets: [
    'Cultivated strong client relationships by assessing individual financial needs, resulting in an 11% increase in sales',
    'Exceeded sales targets, achieving a top 15% performance ranking within the district',
  ],
  skills: ['Financial Planning', 'Sales', 'Client Advisory', 'Product Knowledge'],
  logoSrc: assets.logoTd,
  logoAlt: 'TD Canada Trust',
})

const createRbcAdvisorExperience = (): ResumeExperienceItem => ({
  id: 'experience-rbc-advisor',
  role: 'Banking Advisor',
  company: 'Royal Bank of Canada',
  location: 'Kingston, ON',
  date: '2020-2021',
  bullets: [
    'Strengthened client relationships by advising on personalized solutions, increased repeat transactions by 13%',
    'Excelled in needs-based advising, boosting adoption of core products like GICs, mutual funds, and TFSAs by 8%',
  ],
  skills: ['Banking Products', 'Financial Advisory', 'Client Relationship Management', 'Digital Banking'],
  logoSrc: assets.logoRbc,
  logoAlt: 'Royal Bank of Canada',
})

const createRbcInternExperience = (): ResumeExperienceItem => ({
  id: 'experience-rbc-intern',
  role: 'Client Advisor Intern',
  company: 'Royal Bank of Canada',
  location: 'Fredericton, NB',
  date: '2019-2020',
  bullets: [],
  skills: [],
  logoSrc: assets.logoRbc,
  logoAlt: 'Royal Bank of Canada',
})

const createIrvingExperience = (): ResumeExperienceItem => ({
  id: 'experience-irving',
  role: 'Marketing Intern',
  company: 'Irving Oil Limited',
  location: 'Saint John, NB',
  date: '2018',
  bullets: [],
  skills: [],
  logoSrc: assets.logoIrving,
  logoAlt: 'Irving Oil',
})

const createGrantExperience = (): ResumeExperienceItem => ({
  id: 'experience-grant-thornton',
  role: 'Tax Return Intern',
  company: 'Grant Thornton LLP',
  location: 'Saint John, NB',
  date: '2018',
  bullets: [],
  skills: [],
  logoSrc: assets.logoGrantThornton,
  logoAlt: 'Grant Thornton',
})

const baseCertifications = () => ({
  featured: [
    {
      id: 'cert-cfa',
      title: 'CFA Level I Candidate',
      organization: 'CFA Institute',
      detail: 'Investment Analysis & Ethics',
      date: '2026',
      logoSrc: assets.logoCfa,
      logoAlt: 'CFA Institute',
    },
    {
      id: 'cert-gre',
      title: 'GRE General Test',
      organization: 'Educational Testing Service',
      detail: 'Score: 325 (Q: 165, V: 160)',
      date: '2024',
      logoSrc: assets.logoEts,
      logoAlt: 'Educational Testing Service',
    },
  ],
  stats: [
    {
      id: 'cert-stat-finance',
      label: 'Finance Certifications',
      count: '10',
      logos: [
        { src: assets.logoCsi, alt: 'CSI' },
        { src: assets.logoTrainingTheStreet, alt: 'Training The Street' },
        { src: assets.logoBloomberg, alt: 'Bloomberg' },
        { src: assets.logoMcgillAlt, alt: 'McGill University' },
      ],
    },
    {
      id: 'cert-stat-tech',
      label: 'Technology Certifications',
      count: '6',
      logos: [{ src: assets.logoCoursera, alt: 'Coursera' }],
    },
    {
      id: 'cert-stat-analytics',
      label: 'Analytics Certifications',
      count: '5',
      logos: [{ src: assets.logoCoursera, alt: 'Coursera' }],
    },
  ],
})

const createLeadershipGroups = (): ResumeLeadershipGroup[] => [
  {
    id: 'leadership-primary',
    layout: 'stack',
    items: [
      {
        id: 'leadership-united-way',
        role: 'Next Gen Ambassador',
        organization: 'United Way',
        location: 'Toronto, ON',
        date: '2020-Present',
        logoSrc: assets.logoUnitedWay,
        logoAlt: 'United Way',
      },
    ],
  },
  {
    id: 'leadership-secondary',
    layout: 'grid',
    columns: 2,
    items: [
      {
        id: 'leadership-rbc',
        role: 'Student Ambassador',
        organization: 'Royal Bank of Canada',
        location: 'Fredericton, NB',
        date: '2019-2020',
        logoSrc: assets.logoRbc,
        logoAlt: 'Royal Bank of Canada',
      },
      {
        id: 'leadership-irving',
        role: 'Volunteer Staff',
        organization: 'Irving Oil Limited',
        location: 'Saint John, NB',
        date: '2018',
        logoSrc: assets.logoIrving,
        logoAlt: 'Irving Oil',
      },
    ],
  },
]

const buildExperienceGroups = (hasFiscal: boolean, bmoDate: string) => {
  const primary: ResumeExperienceItem[] = [createStringsExperience()]
  if (hasFiscal) {
    primary.push(createFiscalExperience())
  }
  primary.push(createBmoExperience(bmoDate))

  const groups: ResumeExperienceGroup[] = [
    {
      id: 'experience-early',
      title: 'Early Career Experience',
      layout: 'stack',
      items: [createTdExperience(), createRbcAdvisorExperience()],
    },
    {
      id: 'experience-coop',
      title: 'Co-op Experience',
      layout: 'stack',
      items: [createRbcInternExperience()],
    },
    {
      id: 'experience-coop-secondary',
      layout: 'grid',
      columns: 2,
      items: [createIrvingExperience(), createGrantExperience()],
    },
  ]

  return { primary, groups }
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'unb',
    label: 'UNB Resume',
    description: 'University of New Brunswick resume layout',
    theme: {
      accent: '#a3061a',
      accentSoft: '#fde2e4',
      accentDark: '#7a0212',
    },
    data: {
      header: baseHeader('tyler@tylerbustard.ca', 'tylerbustard.ca'),
      education: [createUnbEducation()],
      experience: buildExperienceGroups(false, '2022-2025'),
      certifications: baseCertifications(),
      leadership: createLeadershipGroups(),
    },
  },
  {
    id: 'queens',
    label: "Queen's Resume",
    description: "Queen's University focus with Smith School entry",
    theme: {
      accent: '#0f3d61',
      accentSoft: '#e5efff',
      accentDark: '#0a2740',
    },
    data: {
      header: baseHeader('tyler@tylerbustard.net', 'tylerbustard.net'),
      education: [
        {
          id: 'education-queens',
          degree: 'Master of Finance Candidate',
          program: 'Smith School of Business',
          school: "Queen's University",
          date: '2025-2027',
          bullets: [
            'Case Competitions: CFA Research Challenge and Investment Banking Competition',
            "Analyst - Financial sector - Queen's University Alternative Assets Fund (QUAAF)",
            'Member of Finance Club, Case Competition Union and Investment-Banking Clubs',
            "Dean's Entrance Scholarship Award, Total $5,000",
          ],
          logoSrc: assets.logoQueensAlt,
          logoAlt: "Queen's University",
        },
        createUnbEducation(),
      ],
      experience: buildExperienceGroups(true, '2022-2023'),
      certifications: baseCertifications(),
      leadership: createLeadershipGroups(),
    },
  },
  {
    id: 'mcgill',
    label: 'McGill Resume',
    description: 'McGill Desautels resume variant',
    theme: {
      accent: '#b5121b',
      accentSoft: '#fde4e6',
      accentDark: '#7f0d14',
    },
    data: {
      header: baseHeader('tyler@tylerbustard.com', 'tylerbustard.com'),
      education: [
        {
          id: 'education-mcgill',
          degree: 'Master of Management in Finance Candidate',
          program: 'Desautels Faculty of Management',
          school: 'McGill University',
          date: '2025-2026',
          bullets: [
            'Head of Risk Management - Desautels Capital Management Fund',
            'Chief Sustainability Officer - DCM Socially Responsible Investing Fund',
            'Recipient of 2 Scholarships for academic merit and leadership skills, Total $13,000',
          ],
          logoSrc: assets.logoMcgillAlt,
          logoAlt: 'McGill University',
        },
        createUnbEducation(),
      ],
      experience: buildExperienceGroups(true, '2022-2023'),
      certifications: baseCertifications(),
      leadership: createLeadershipGroups(),
    },
  },
  {
    id: 'rotman',
    label: 'Rotman Resume',
    description: 'University of Toronto Rotman layout',
    theme: {
      accent: '#1d4ed8',
      accentSoft: '#dbeafe',
      accentDark: '#12397a',
    },
    data: {
      header: baseHeader('tyler@tylerbustard.info', 'tylerbustard.info'),
      education: [
        {
          id: 'education-rotman',
          degree: 'Master of Business Administration',
          program: 'Rotman School of Management',
          school: 'University of Toronto',
          date: '2025-2026',
          bullets: [
            'Analyst, Financials and Real Estate sectors - Rotman Student Investment Fund',
            'Case Competitions: 1st Place (CIBC), 3rd Place (TD), RBC and SLC participant',
            'Entrance Scholarship and Emerging Canadian Leadership Award - Total $25,000',
          ],
          logoSrc: assets.logoRotman,
          logoAlt: 'Rotman School of Management',
        },
        createUnbEducation(),
      ],
      experience: buildExperienceGroups(false, '2022-2023'),
      certifications: baseCertifications(),
      leadership: createLeadershipGroups(),
    },
  },
]
