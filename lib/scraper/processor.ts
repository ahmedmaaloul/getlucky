export class JobProcessor {
    static process(title: string, description: string, source: string, location: string) {
        // Simple normalization logic
        const descLower = description.toLowerCase();
        const titleLower = title.toLowerCase();

        let salary = null;
        // Basic salary extraction (example regex)
        const salaryMatch = description.match(/(\$|€|£)\s?(\d{2,3}[,.]?\d{3})/);
        if (salaryMatch) {
            salary = salaryMatch[0];
        }

        let jobType = 'Full-time';
        if (descLower.includes('part-time') || descLower.includes('part time')) jobType = 'Part-time';
        if (descLower.includes('contract') || descLower.includes('freelance')) jobType = 'Contract';
        if (descLower.includes('intern') || descLower.includes('internship') || descLower.includes('werkstudent')) jobType = 'Internship';

        let seniority = 'Unknown';
        if (titleLower.includes('senior') || titleLower.includes('sr.') || titleLower.includes('lead')) seniority = 'Senior';
        if (titleLower.includes('junior') || titleLower.includes('jr.') || titleLower.includes('entry')) seniority = 'Junior';
        if (titleLower.includes('manager') || titleLower.includes('head')) seniority = 'Management';
        if (titleLower.includes('intern') || titleLower.includes('student')) seniority = 'Student';
        if (seniority === 'Unknown' && (descLower.includes('3+ years') || descLower.includes('5+ years'))) seniority = 'Mid-Level';

        // Country detection
        let country = 'Global';
        if (location.includes('Germany') || location.includes('Berlin') || location.includes('Munich') || location.includes('Hamburg')) country = 'Germany';
        if (location.includes('UK') || location.includes('London') || location.includes('United Kingdom')) country = 'UK';
        if (location.includes('France') || location.includes('Paris')) country = 'France';
        if (location.includes('Saudi') || location.includes('Riyadh') || location.includes('Jeddah')) country = 'Saudi Arabia';
        if (location.includes('USA') || location.includes('United States') || location.includes('New York') || location.includes('San Francisco')) country = 'USA';
        if (location.includes('Canada') || location.includes('Toronto') || location.includes('Vancouver') || location.includes('Montreal')) country = 'Canada';
        if (location.includes('Japan') || location.includes('Tokyo') || location.includes('Osaka')) country = 'Japan';

        // Language detection
        let language = 'English'; // Default
        if (descLower.includes('german') || descLower.includes('deutsch')) language = 'German';
        if (descLower.includes('french') || descLower.includes('français')) language = 'French';
        if (descLower.includes('arabic') || descLower.includes('arabic')) language = 'Arabic';
        // Check if description is primarily non-english (heuristic)
        // ... simplistic check for now

        // Tags
        const tags = [];
        const techStack = ['React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', 'C++', 'Go', 'Rust', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'TypeScript', 'JavaScript', 'SQL', 'NoSQL'];
        for (const tech of techStack) {
            if (descLower.includes(tech.toLowerCase())) {
                tags.push(tech);
            }
        }

        return {
            salary,
            jobType,
            seniority,
            country,
            language,
            tags
        };
    }
}
