export const EXAMS = [
    { id: 'jee-main', name: 'JEE Main', emoji: '🇮🇳', category: 'Engineering' },
    { id: 'jee-adv', name: 'JEE Advanced', emoji: '⚗️', category: 'Engineering' },
    { id: 'neet', name: 'NEET', emoji: '🧬', category: 'Medical' },
    { id: 'sat', name: 'SAT', emoji: '🇺🇸', category: 'Study Abroad' },
    { id: 'act', name: 'ACT', emoji: '📐', category: 'Study Abroad' },
    { id: 'ielts', name: 'IELTS', emoji: '🌏', category: 'Language' },
    { id: 'toefl', name: 'TOEFL', emoji: '🎓', category: 'Language' },
    { id: 'upsc', name: 'UPSC', emoji: '⚖️', category: 'Civil Services' },
    { id: 'gre', name: 'GRE', emoji: '📊', category: 'Grad School' },
    { id: 'gmat', name: 'GMAT', emoji: '💼', category: 'Business' },
    { id: 'aps', name: 'APS', emoji: '🏫', category: 'School' },
    { id: 'cuet', name: 'CUET', emoji: '📚', category: 'University' }
];

// Simplified Syllabus Data structure
export const SYLLABUS_DATA = {
    'jee-main': {
        'Physics': [
            { name: 'Units & Dimensions', topics: ['SI Units', 'Dimensional Analysis', 'Errors'] },
            { name: 'Kinematics', topics: ['Motion in 1D', 'Projectile Motion', 'Relative Motion'] },
            { name: 'Laws of Motion', topics: ['Newton\'s Laws', 'Friction', 'Circular Motion'] },
            { name: 'Work, Energy & Power', topics: ['Work-Energy Theorem', 'Conservation of Energy', 'Power'] },
            { name: 'Rotational Motion', topics: ['Moment of Inertia', 'Torque', 'Rolling Motion'] }
        ],
        'Chemistry': [
            { name: 'Atomic Structure', topics: ['Bohr Model', 'Quantum Numbers', 'Electronic Config'] },
            { name: 'Chemical Bonding', topics: ['VSEPR Theory', 'Hybridization', 'MOT'] },
            { name: 'Thermodynamics', topics: ['First Law', 'Entropy', 'Gibbs Free Energy'] },
            { name: 'Equilibrium', topics: ['Chemical Equilibrium', 'Ionic Equilibrium', 'pH & Buffers'] }
        ],
        'Mathematics': [
            { name: 'Sets, Relations & Functions', topics: ['Set Theory', 'Types of Relations', 'Domain & Range'] },
            { name: 'Complex Numbers', topics: ['Algebra of Complex Numbers', 'Argand Plane', 'Cube Roots of Unity'] },
            { name: 'Quadratic Equations', topics: ['Roots & Coefficients', 'Nature of Roots', 'Location of Roots'] },
            { name: 'Calculus', topics: ['Limits', 'Continuity', 'Differentiation', 'Integration'] }
        ]
    },
    'neet': {
        'Biology': [
            { name: 'Diversity in Living World', topics: ['Taxonomy', 'Five Kingdom Classification'] },
            { name: 'Structural Organization', topics: ['Animal Tissues', 'Plant Anatomy'] },
            { name: 'Cell Structure', topics: ['Cell Theory', 'Cell Division', 'Biomolecules'] }
        ],
        'Physics': [
            { name: 'Mechanics', topics: ['Laws of Motion', 'Work Energy Power', 'Gravitation'] },
            { name: 'Electrodynamics', topics: ['Electrostatics', 'Current Electricity', 'Magnetism'] }
        ],
        'Chemistry': [
            { name: 'Physical Chemistry', topics: ['Mole Concept', 'Atomic Structure', 'Equilibrium'] },
            { name: 'Organic Chemistry', topics: ['GOC', 'Hydrocarbons', 'Alcohol Phenol Ether'] }
        ]
    }
    // Add other exams as needed
};
