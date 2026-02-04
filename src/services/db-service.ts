import { supabase } from "@/integrations/supabase/client";

export interface InterviewSession {
    id: string;
    user_id: string;
    company: string;
    role: string;
    status: string;
    current_round: string;
    total_score: number;
}

export const dbService = {
    /**
     * Create a new interview session in Supabase
     */
    async createInterview(userId: string, company: string, role: string) {
        const { data, error } = await supabase
            .from('interviews')
            .insert({
                user_id: userId,
                company,
                role,
                status: 'in_progress',
                current_round: 'aptitude'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update the score and feedback for a specific round
     */
    async saveRoundResult(interviewId: string, roundType: string, score: number, feedback?: string) {
        const { error } = await supabase
            .from('interview_scores')
            .insert({
                interview_id: interviewId,
                round_type: roundType,
                score,
                max_score: 100,
                feedback
            });

        if (error) throw error;

        // Update the current round and total score in the interview table
        const { data: interview } = await supabase
            .from('interviews')
            .select('total_score')
            .eq('id', interviewId)
            .single();

        const newTotalScore = (interview?.total_score || 0) + score;

        await supabase
            .from('interviews')
            .update({
                current_round: roundType === 'aptitude' ? 'coding' : roundType === 'coding' ? 'interview' : 'complete',
                total_score: newTotalScore,
                status: roundType === 'interview' ? 'completed' : 'in_progress',
                updated_at: new Date().toISOString()
            })
            .eq('id', interviewId);
    },

    /**
     * Get all results for an interview
     */
    async getInterviewResults(interviewId: string) {
        const { data, error } = await supabase
            .from('interview_scores')
            .select('*')
            .eq('interview_id', interviewId);

        if (error) throw error;
        return data;
    },

    /**
     * Save the final AI-generated feedback report
     */
    async saveFinalFeedback(interviewId: string, feedback: any) {
        await supabase
            .from('interviews')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', interviewId);

        await supabase
            .from('interview_scores')
            .insert({
                interview_id: interviewId,
                round_type: 'final_report',
                score: feedback.overall_score || 0,
                max_score: 100,
                feedback: JSON.stringify(feedback)
            });
    }
};
