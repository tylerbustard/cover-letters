import { Mail, Phone, MapPin, Globe } from "lucide-react";

interface CoverLetterData {
  companyName: string;
  position: string;
  hiringManager: string;
  date: string;
  yourName: string;
  yourEmail: string;
  yourPhone: string;
  yourAddress: string;
  companyAddress: string;
  openingParagraph: string;
  bodyParagraph1: string;
  bodyParagraph2: string;
  bodyParagraph3: string;
  closingParagraph: string;
}

interface CoverLetterVariationProps {
  data: CoverLetterData;
  variation: 'mcgill' | 'queens' | 'unb' | 'uoft';
}

export default function CoverLetterVariation({ data, variation }: CoverLetterVariationProps) {
  // Define color schemes for each variation
  const colorSchemes = {
    mcgill: {
      primary: 'text-red-600',
      accent: 'text-red-500',
      bg: 'from-red-50 to-gray-50',
      border: 'border-red-100',
    },
    queens: {
      primary: 'text-blue-600',
      accent: 'text-blue-500',
      bg: 'from-blue-50 to-gray-50',
      border: 'border-blue-100',
    },
    unb: {
      primary: 'text-blue-600',
      accent: 'text-blue-500',
      bg: 'from-blue-50 to-gray-50',
      border: 'border-blue-100',
    },
    uoft: {
      primary: 'text-blue-600',
      accent: 'text-blue-500',
      bg: 'from-blue-50 to-gray-50',
      border: 'border-blue-100',
    },
  };

  const colors = colorSchemes[variation];

  return (
    <div className="cover-letter-page bg-white rounded-2xl shadow-lg mb-6 print:shadow-none print:border-0 print:rounded-none"
         style={{ 
           width: '21.59cm',
           minHeight: '27.94cm',
           height: 'auto',
           padding: '1.5cm 1.27cm 2.54cm 1.27cm',
           margin: '0 auto',
           boxSizing: 'border-box',
           overflow: 'visible',
           border: '1px solid rgba(0,0,0,0.08)'
         }}>
      
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-start gap-4 mb-4">
          {/* Name and Contact Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" 
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', letterSpacing: '-0.02em' }}>
              {data.yourName}
            </h1>
            
            {/* Contact Bar */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <Mail className={`w-3.5 h-3.5 ${colors.accent}`} />
                <span>{data.yourEmail}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className={`w-3.5 h-3.5 ${colors.accent}`} />
                <span>{data.yourPhone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className={`w-3.5 h-3.5 ${colors.accent}`} />
                <span>tylerbustard.ca</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className={`w-3.5 h-3.5 ${colors.accent}`} />
                <span>{data.yourAddress}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">{data.date}</p>
      </div>

      {/* Recipient */}
      <div className="mb-6">
        <p className="text-sm text-gray-900">{data.companyAddress || data.companyName}</p>
      </div>

      {/* Greeting */}
      <div className="mb-4">
        <p className="text-gray-900">Dear {data.hiringManager},</p>
      </div>

      {/* Body */}
      <div className="space-y-4 mb-4 text-gray-900 leading-relaxed">
        <p>{data.openingParagraph || `I am writing to express my strong interest in the ${data.position} position at ${data.companyName}. With my background in finance and technology, I am excited about the opportunity to contribute to your team.`}</p>
        {data.bodyParagraph1 && <p>{data.bodyParagraph1}</p>}
        {data.bodyParagraph2 && <p>{data.bodyParagraph2}</p>}
        {data.bodyParagraph3 && <p>{data.bodyParagraph3}</p>}
        <p>{data.closingParagraph || `I am eager to bring my skills and passion to ${data.companyName} and would welcome the opportunity to discuss how my experience aligns with your needs. Thank you for considering my application.`}</p>
      </div>

      {/* Closing */}
      <div className="mt-8">
        <p className="text-gray-900 mb-2">Sincerely,</p>
        <p className="text-gray-900 font-medium">{data.yourName}</p>
      </div>
    </div>
  );
}

