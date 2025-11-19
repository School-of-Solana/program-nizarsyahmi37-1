use anchor_lang::prelude::*;
use anchor_spl::token::{FreezeAccount, Mint, ThawAccount, Token, TokenAccount};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProposalState {
    Pending,
    Passed,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VoteType {
    Yes,
    No,
}

declare_id!("5NnuMeVonNB9VDcFosMQLKvGbUTkQdvUtou8FL2uFz9R");

#[program]
pub mod hob_dao {
    use super::*;

    pub fn initialize_dao(
        ctx: Context<InitializeDao>,
        quorum_percentage: u8,
        total_voters: u64,
    ) -> Result<()> {
        let dao_state = &mut ctx.accounts.dao_state;
        dao_state.proposal_count = 0;
        dao_state.token_mint = ctx.accounts.token_mint.key();
        dao_state.quorum_percentage = quorum_percentage;
        dao_state.total_voters = total_voters;
        dao_state.authority = ctx.accounts.authority.key();

        Ok(())
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
    ) -> Result<()> {
        let dao_state = &mut ctx.accounts.dao_state;
        let proposal = &mut ctx.accounts.proposal;
        let creator_token_account = &ctx.accounts.creator_token_account;

        require!(
            title.len() > 0 && title.len() <= 100,
            ErrorCode::InvalidProposalTitle
        );
        require!(
            description.len() > 0 && description.len() <= 500,
            ErrorCode::InvalidProposalDescription
        );

        if creator_token_account.amount < 1 {
            return Err(ErrorCode::NotEnoughTokens.into());
        }

        if creator_token_account.is_frozen() {
            return Err(ErrorCode::AccountFrozen.into());
        }

        if ctx.accounts.mint.key() != dao_state.token_mint {
            return Err(ErrorCode::InvalidTokenMint.into());
        }

        dao_state.proposal_count = dao_state.proposal_count.checked_add(1).unwrap();
        proposal.proposal_id = dao_state.proposal_count;

        proposal.title = title;
        proposal.description = description;
        proposal.yes_votes = 0;
        proposal.no_votes = 0;
        proposal.state = ProposalState::Pending;
        proposal.creator = ctx.accounts.authority.key();
        proposal.dao_state = ctx.accounts.dao_state.key();
        proposal.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn vote_on_proposal(ctx: Context<VoteOnProposal>, vote_type: VoteType) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let voter_account = &ctx.accounts.voter_token_account;
        let dao_state = &mut ctx.accounts.dao_state;

        require!(
            proposal.dao_state == dao_state.key(),
            ErrorCode::InvalidProposalDao
        );

        if voter_account.amount < 1 {
            return Err(ErrorCode::NotEnoughTokens.into());
        }

        if voter_account.is_frozen() {
            return Err(ErrorCode::AccountFrozen.into());
        }

        if ctx.accounts.mint.key() != dao_state.token_mint {
            return Err(ErrorCode::InvalidTokenMint.into());
        }

        let voter_state = &mut ctx.accounts.voter_state;
        if voter_state.has_voted {
            return Err(ErrorCode::AlreadyVoted.into());
        }

        if proposal.state != ProposalState::Pending {
            return Err(ErrorCode::ProposalNotPending.into());
        }

        match vote_type {
            VoteType::Yes => {
                proposal.yes_votes = proposal.yes_votes.checked_add(1).unwrap();
            }
            VoteType::No => {
                proposal.no_votes = proposal.no_votes.checked_add(1).unwrap();
            }
        }

        voter_state.has_voted = true;
        voter_state.vote_type = vote_type;

        // Use checked arithmetic to avoid overflow/underflow in on-chain math
        let total_votes = proposal
            .yes_votes
            .checked_add(proposal.no_votes)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let denom = dao_state.total_voters.max(1);
        let vote_percentage = total_votes
            .checked_mul(100)
            .ok_or(ErrorCode::ArithmeticOverflow)?
            .checked_div(denom)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        if vote_percentage >= dao_state.quorum_percentage as u64 {
            if proposal.yes_votes > proposal.no_votes {
                proposal.state = ProposalState::Passed;
            } else {
                proposal.state = ProposalState::Rejected;
            }
        } else {
            if total_votes == dao_state.total_voters {
                if proposal.yes_votes > proposal.no_votes {
                    proposal.state = ProposalState::Passed;
                } else {
                    proposal.state = ProposalState::Rejected;
                }
            }
        }

        Ok(())
    }

    pub fn update_quorum_percentage(
        ctx: Context<UpdateQuorumPercentage>,
        new_quorum_percentage: u8,
    ) -> Result<()> {
        require!(
            new_quorum_percentage <= 100,
            ErrorCode::InvalidQuorumPercentage
        );

        let dao_state = &mut ctx.accounts.dao_state;
        dao_state.quorum_percentage = new_quorum_percentage;

        Ok(())
    }

    pub fn update_total_voters(
        ctx: Context<UpdateTotalVoters>,
        new_total_voters: u64,
    ) -> Result<()> {
        require!(new_total_voters > 0, ErrorCode::InvalidTotalVoters);

        let dao_state = &mut ctx.accounts.dao_state;
        dao_state.total_voters = new_total_voters;

        Ok(())
    }

    pub fn freeze_token_account(ctx: Context<FreezeTokenAccount>) -> Result<()> {
        let cpi_accounts = FreezeAccount {
            account: ctx.accounts.token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        anchor_spl::token::freeze_account(cpi_ctx)?;

        Ok(())
    }

    pub fn unfreeze_token_account(ctx: Context<UnfreezeTokenAccount>) -> Result<()> {
        let cpi_accounts = ThawAccount {
            account: ctx.accounts.token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        anchor_spl::token::thaw_account(cpi_ctx)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeDao<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 32 + 1 + 8 + 32,
        seeds = [b"dao"],
        bump
    )]
    pub dao_state: Account<'info, DaoState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Token mint account is validated by the SPL Token program
    pub token_mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub dao_state: Account<'info, DaoState>,
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 4 + title.len() + 4 + description.len() + 8 + 8 + 1 + 32 + 32 + 8,
        seeds = [b"proposal", dao_state.key().as_ref(), dao_state.proposal_count.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    pub mint: Account<'info, Mint>,
    #[account(
        token::mint = mint,
        token::authority = authority
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct VoteOnProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(
        mut,
        seeds = [b"dao"],
        bump
    )]
    pub dao_state: Account<'info, DaoState>,
    #[account(
        init,
        payer = authority,
        space = 8 + 1 + 1,
        seeds = [b"voter", proposal.key().as_ref(), authority.key().as_ref()],
        bump
    )]
    pub voter_state: Account<'info, VoterState>,
    pub mint: Account<'info, Mint>,
    #[account(
        token::mint = mint,
        token::authority = authority
    )]
    pub voter_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateQuorumPercentage<'info> {
    #[account(
        mut,
        seeds = [b"dao"],
        bump
    )]
    pub dao_state: Account<'info, DaoState>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateTotalVoters<'info> {
    #[account(
        mut,
        seeds = [b"dao"],
        bump,
        has_one = authority
    )]
    pub dao_state: Account<'info, DaoState>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FreezeTokenAccount<'info> {
    #[account(
        mut,
        token::mint = mint,
        token::authority = wallet
    )]
    pub token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub wallet: SystemAccount<'info>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UnfreezeTokenAccount<'info> {
    #[account(
        mut,
        token::mint = mint,
        token::authority = wallet
    )]
    pub token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub wallet: SystemAccount<'info>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct DaoState {
    pub proposal_count: u64,
    pub token_mint: Pubkey,
    pub quorum_percentage: u8,
    pub total_voters: u64,
    pub authority: Pubkey,
}

#[account]
pub struct Proposal {
    pub proposal_id: u64,
    pub title: String,
    pub description: String,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub state: ProposalState,
    pub creator: Pubkey,
    pub dao_state: Pubkey,
    pub created_at: i64,
}

#[account]
pub struct VoterState {
    pub has_voted: bool,
    pub vote_type: VoteType,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You don't have enough tokens to vote on this proposal.")]
    NotEnoughTokens,
    #[msg("You have already voted on this proposal.")]
    AlreadyVoted,
    #[msg("The proposal doesn't have enough votes to be executed.")]
    NotEnoughVotes,
    #[msg("This proposal has already been executed.")]
    ProposalAlreadyExecuted,
    #[msg("Invalid token mint. The provided token does not match the DAO's token.")]
    InvalidTokenMint,
    #[msg("This proposal is not in pending state and cannot be voted on.")]
    ProposalNotPending,
    #[msg("Invalid quorum percentage. Must be between 0 and 100.")]
    InvalidQuorumPercentage,
    #[msg("Invalid proposal title. Must be between 1 and 100 characters.")]
    InvalidProposalTitle,
    #[msg("Invalid proposal description. Must be between 1 and 500 characters.")]
    InvalidProposalDescription,
    #[msg("Proposal does not belong to this DAO.")]
    InvalidProposalDao,
    #[msg("Token account is frozen and cannot participate in governance.")]
    AccountFrozen,
    #[msg("Arithmetic overflow or underflow occurred during calculation.")]
    ArithmeticOverflow,
    #[msg("Invalid total voters count. Must be greater than 0.")]
    InvalidTotalVoters,
}
