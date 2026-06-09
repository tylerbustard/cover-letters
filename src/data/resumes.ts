import { assets } from './assets'
import type {
  ResumeCertificationArea,
  ResumeExperienceGroup,
  ResumeExperienceItem,
  ResumeLeadershipGroup,
  ResumeTemplate,
} from '@/types'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const baseSummary =
  'Finance and technology professional with experience across portfolio monitoring, financial analysis, reconciliation, and data-driven reporting, combining analytical execution, strategic judgment, and client-focused communication.'

const baseHeader = (email: string, website: string) => ({
  name: 'Tyler Bustard',
  title: 'Finance & Technology',
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
  degree: 'Bachelor of Business Administration, Finance',
  program: 'Saint John, NB',
  school: 'University of New Brunswick',
  date: '2016-2020',
  bullets: [
    'Student Investment Fund Analyst and Portfolio Manager, 5 Academic Awards ($47,500 in scholarships)',
    'UNB Finance Club, RBC Student Ambassador, Accredited Co-op Program',
    'RBC Student Ambassador of the Month, February 2020',
  ],
  logoSrc: assets.logoUnbFull,
  logoAlt: 'University of New Brunswick',
})

const createQueensEducation = () => ({
  id: 'education-queens-mfin',
  degree: 'Master of Finance Candidate',
  program: 'Smith School of Business',
  school: "Queen's University",
  date: '2026-2027',
  bullets: [
    'Graduate finance candidacy aligned with investment analysis, capital markets, risk, and portfolio decision-making',
    'Professional focus on Canadian finance, banking, and investment operations',
  ],
  logoSrc: assets.logoQueensAlt,
  logoAlt: "Queen's University",
})

export const createNccEducation = () => ({
  id: 'education-northeast-christian-college',
  degree: 'Theology Program',
  program: 'Fredericton, NB',
  school: 'Northeast Christian College',
  date: '2014-2015',
  bullets: [
    'Major in Theology with coursework across Bible, ministry, leadership, communication, ethics, and practical skills',
    'Campus and ministry exposure included weekend ministry, chapel service, student council, social committees, and annual benefit concert pathways',
  ],
  logoSrc: assets.logoNcc,
  logoAlt: 'Northeast Christian College',
})

const createStringsExperience = (): ResumeExperienceItem => ({
  id: 'experience-73strings',
  role: 'Senior Associate, Portfolio Monitoring',
  company: '73 Strings',
  location: 'Toronto, ON',
  date: 'Jan 2025 - May 2026',
  bullets: [
    'Monitored daily NAV inputs and validated holdings and cash flows, which supported accurate fund valuations across 15+ portfolios',
    'Reviewed reconciliation workflows and investigated exceptions, reducing resolution time by 18% through streamlined communication with operations risk and portfolio managers',
  ],
  skills: ['Portfolio Monitoring', 'Reconciliation', 'NAV Validation', 'SQL', 'Excel'],
  logoSrc: assets.logo73Strings,
  logoAlt: '73 Strings',
})

const createRoiExperience = (): ResumeExperienceItem => ({
  id: 'experience-roi',
  role: 'Equity Analyst',
  company: 'ROI',
  location: 'Toronto, ON',
  date: '2023-2025',
  bullets: [
    'Analyzed and compiled public company financial statements, cutting reporting turnaround by 13%',
    'Collaborated with product and engineering to implement AI-driven data features, boosting adoption by 12%',
  ],
  skills: ['Financial Analysis', 'AI Integration', 'Data Analytics', 'Python', 'SQL'],
  logoSrc: assets.logoRoi,
  logoAlt: 'ROI',
})

const createBmoExperience = (date: string): ResumeExperienceItem => ({
  id: 'experience-bmo',
  role: 'Portfolio Assistant',
  company: 'BMO Private Wealth',
  location: 'Toronto, ON',
  date,
  bullets: [
    'Advised two Investment Counsellors managing portfolios over $100M and cut preparation time by 12%',
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
  bullets: [
    'Resolved complex client issues, achieving a 15% boost in positive feedback scores for the branch',
    "Promoted RBC's digital banking tools, leading to a 10% increase in online and mobile banking adoption",
  ],
  skills: ['Client Service', 'Digital Banking', 'Problem Resolution', 'Customer Support'],
  logoSrc: assets.logoRbc,
  logoAlt: 'Royal Bank of Canada',
})

const createGrantExperience = (): ResumeExperienceItem => ({
  id: 'experience-grant-thornton',
  role: 'Tax Return Intern',
  company: 'Grant Thornton LLP',
  location: 'Saint John, NB',
  date: '2018',
  bullets: [
    'Streamlined client financial data, boosting accuracy by 10% ensuring timely submission of 100+ tax returns',
    'Improved tax return preparation processes, cutting filing errors by 15%',
  ],
  skills: ['Tax Preparation', 'Financial Analysis', 'Data Management', 'Client Service'],
  logoSrc: assets.logoGrantThornton,
  logoAlt: 'Grant Thornton',
})

const createCertificationAreas = (): ResumeCertificationArea[] => [
  {
    id: 'cert-investment-markets',
    title: 'Investment & Markets',
    caption: 'CFA, valuation, and market fluency',
    column: 'left',
    items: [
      {
        id: 'cert-cfa',
        name: 'CFA Level I Candidate',
        issuer: 'CFA Institute',
        year: '2026',
        logoSrc: assets.logoCfa,
        logoAlt: 'CFA Institute',
        emphasis: true,
      },
      {
        id: 'cert-tts',
        name: 'Discounted Cash Flow Analysis and Modeling',
        issuer: 'Training The Street',
        year: '2024',
        logoSrc: assets.logoTrainingTheStreet,
        logoAlt: 'Training The Street',
      },
      {
        id: 'cert-wall-street-prep',
        name: 'Financial & Valuation Modeling',
        issuer: 'Wall Street Prep',
        year: '2020',
        logoSrc: assets.logoWallStreetPrep,
        logoAlt: 'Wall Street Prep',
      },
      {
        id: 'cert-bloomberg',
        name: 'Bloomberg Market Concepts Certificate',
        issuer: 'Bloomberg',
        year: '2020',
        logoSrc: assets.logoBloomberg,
        logoAlt: 'Bloomberg',
      },
    ],
  },
  {
    id: 'cert-advisory',
    title: 'Advisory & Wealth Planning',
    caption: 'Licensing, suitability, and client advice',
    column: 'right',
    items: [
      {
        id: 'cert-planning',
        name: 'Financial Planning 1',
        issuer: 'Canadian Securities Institute',
        year: '2023',
        logoSrc: assets.logoCsi,
        logoAlt: 'Canadian Securities Institute',
      },
      {
        id: 'cert-advice',
        name: 'Certificate in Financial Services Advice',
        issuer: 'Canadian Securities Institute',
        year: '2022',
        logoSrc: assets.logoCsi,
        logoAlt: 'Canadian Securities Institute',
      },
      {
        id: 'cert-csc',
        name: 'Canadian Securities Course',
        issuer: 'Canadian Securities Institute',
        year: '2021',
        logoSrc: assets.logoCsi,
        logoAlt: 'Canadian Securities Institute',
      },
      {
        id: 'cert-pfsa',
        name: 'Personal Financial Service Advice',
        issuer: 'Canadian Securities Institute',
        year: '2021',
        logoSrc: assets.logoCsi,
        logoAlt: 'Canadian Securities Institute',
      },
      {
        id: 'cert-mutual-funds',
        name: 'Investment Funds in Canada',
        issuer: 'Canadian Securities Institute',
        year: '2020',
        logoSrc: assets.logoCsi,
        logoAlt: 'Canadian Securities Institute',
      },
    ],
  },
  {
    id: 'cert-data-bi',
    title: 'Data & Business Intelligence',
    caption: 'Analytics, visualization, and automation',
    column: 'left',
    items: [
      {
        id: 'cert-data-analytics',
        name: 'Google Data Analytics Professional Certificate',
        issuer: 'Google',
        year: '2023',
        logoSrc: assets.logoCoursera,
        logoAlt: 'Coursera',
      },
      {
        id: 'cert-python',
        name: 'Python for Everybody Specialization',
        issuer: 'University of Michigan',
        year: '2023',
        logoSrc: assets.logoCoursera,
        logoAlt: 'Coursera',
      },
      {
        id: 'cert-sql',
        name: 'SQL for Data Science',
        issuer: 'UC Davis',
        year: '2020',
        logoSrc: assets.logoCoursera,
        logoAlt: 'Coursera',
      },
    ],
  },
  {
    id: 'cert-quantitative',
    title: 'Quantitative & Statistical Methods',
    caption: 'Modeling, inference, and mathematical foundations',
    column: 'right',
    items: [
      {
        id: 'cert-machine-learning',
        name: 'Machine Learning',
        issuer: 'Stanford University',
        year: '2020',
        logoSrc: assets.logoCoursera,
        logoAlt: 'Coursera',
      },
      {
        id: 'cert-econometrics',
        name: 'Econometrics: Methods & Applications',
        issuer: 'Erasmus University',
        year: '2024',
        logoSrc: assets.logoCoursera,
        logoAlt: 'Coursera',
      },
    ],
  },
  {
    id: 'cert-graduate-admissions',
    title: 'Graduate Admissions',
    caption: 'Standardized assessment',
    column: 'left',
    items: [
      {
        id: 'cert-gre',
        name: 'GRE General Test',
        issuer: 'ETS',
        year: '2024',
        logoSrc: assets.logoEts,
        logoAlt: 'ETS',
        detail: 'Score: 325',
        emphasis: true,
      },
    ],
  },
]

const createLeadershipGroups = (): ResumeLeadershipGroup[] => [
  {
    id: 'community-primary',
    layout: 'stack',
    items: [
      {
        id: 'community-united-way',
        role: 'Next Gen Ambassador',
        organization: 'United Way',
        location: 'Toronto, ON',
        date: '2020-Present',
        bullets: [
          'Led implementation of fundraising strategies achieving 20% increase in funds raised over three years',
        ],
        skills: ['Fundraising', 'Community Engagement', 'Event Planning'],
        logoSrc: assets.logoUnitedWay,
        logoAlt: 'United Way',
      },
      {
        id: 'community-rbc',
        role: 'Student Ambassador',
        organization: 'Royal Bank of Canada',
        location: 'Fredericton, NB',
        date: '2019-2020',
        bullets: [
          'Organized and executed campus-wide events resulting in 25% increase in student engagement and awareness',
        ],
        skills: ['Campus Outreach', 'Event Coordination', 'Brand Representation'],
        logoSrc: assets.logoRbc,
        logoAlt: 'Royal Bank of Canada',
      },
      {
        id: 'community-irving',
        role: 'Volunteer Staff',
        organization: 'Irving Oil Limited',
        location: 'Saint John, NB',
        date: '2018',
        bullets: [
          'Successfully organized and executed engaging activities for over 100 children ensuring safe and enjoyable experience',
        ],
        skills: ['Volunteer Leadership', 'Event Support', 'Teamwork'],
        logoSrc: assets.logoIrving,
        logoAlt: 'Irving Oil',
      },
    ],
  },
]

const buildExperienceGroups = (hasFiscal: boolean, bmoDate: string) => {
  const primary: ResumeExperienceItem[] = [createStringsExperience()]
  if (hasFiscal) {
    primary.push(createRoiExperience())
  }
  primary.push(createBmoExperience(bmoDate))

  const groups: ResumeExperienceGroup[] = [
    {
      id: 'experience-early-career',
      title: 'Early Career Experience',
      layout: 'stack',
      items: [createTdExperience(), createRbcAdvisorExperience()],
    },
    {
      id: 'experience-co-op',
      title: 'Co-op Experience',
      layout: 'stack',
      items: [createRbcInternExperience(), createGrantExperience()],
    },
  ]

  return { primary, groups }
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'unb',
    label: 'UNB Resume',
    description: 'University of New Brunswick content preset aligned to TylerBustard.com.',
    data: {
      header: baseHeader('tyler@tylerbustard.com', 'tylerbustard.com'),
      education: [createUnbEducation(), createNccEducation()],
      experience: buildExperienceGroups(true, '2022-2023'),
      certifications: { areas: clone(createCertificationAreas()) },
      leadership: createLeadershipGroups(),
    },
  },
  {
    id: 'queens',
    label: "Queen's Resume",
    description: "Queen's MFin 2026-2027 package aligned to TylerBustard.com.",
    data: {
      header: baseHeader('tyler@tylerbustard.com', 'tylerbustard.com'),
      education: [
        createQueensEducation(),
        createUnbEducation(),
      ],
      experience: buildExperienceGroups(true, '2022-2023'),
      certifications: { areas: clone(createCertificationAreas()) },
      leadership: createLeadershipGroups(),
    },
  },
  {
    id: 'mcgill',
    label: 'McGill Resume',
    description: 'McGill content preset in the unified studio style.',
    data: {
      header: baseHeader('tyler@tylerbustard.com', 'tylerbustard.com'),
      education: [
        {
          id: 'education-mcgill',
          degree: 'Master of Management in Finance Candidate',
          program: 'Desautels Faculty of Management',
          school: 'McGill University',
          date: '2025-2027',
          bullets: [
            'Head of Risk Management for the Desautels Capital Management Fund and Chief Sustainability Officer for the SRI fund.',
            'Recipient of two scholarships recognizing academic performance and leadership, totaling $13,000.',
          ],
          logoSrc: assets.logoMcgillAlt,
          logoAlt: 'McGill University',
        },
        createUnbEducation(),
        createNccEducation(),
      ],
      experience: buildExperienceGroups(true, '2022-2023'),
      certifications: { areas: clone(createCertificationAreas()) },
      leadership: createLeadershipGroups(),
    },
  },
  {
    id: 'rotman',
    label: 'Rotman Resume',
    description: 'Rotman content preset in the unified studio style.',
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
            'Analyst for the Rotman Student Investment Fund with financials and real estate coverage.',
            'Participant in RBC, TD, and CIBC case competitions with placements across multiple events.',
            'Recipient of the Entrance Scholarship and Emerging Canadian Leadership Award totaling $25,000.',
          ],
          logoSrc: assets.logoRotman,
          logoAlt: 'Rotman School of Management',
        },
        createUnbEducation(),
        createNccEducation(),
      ],
      experience: buildExperienceGroups(false, '2022-2023'),
      certifications: { areas: clone(createCertificationAreas()) },
      leadership: createLeadershipGroups(),
    },
  },
]
