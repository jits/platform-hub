require 'rails_helper'

describe Agents::GitHubAgentService, type: :service do

  let(:token) { 'foo_token' }

  let(:org) { 'SuperLtd' }

  let(:main_team_id) { 55 }

  let(:git_hub_client) { instance_double('Octokit::Client') }

  let(:user) { instance_double('User') }

  let(:github_username) { 'foody_mcfooface' }

  let(:github_identity) { double('identity', external_username: github_username) }

  before do
    expect(Octokit::Client).to receive(:new).with(access_token: token).and_return(git_hub_client)
    @service = Agents::GitHubAgentService.new(
      token: token,
      org: org,
      main_team_id: main_team_id
    )
  end

  describe 'onboard_user' do
    context 'when user does not have a connected GitHub identity' do
      before do
        expect(user).to receive(:identity).with('github').and_return(nil)
      end

      it 'should throw an IdentityMissing error' do
        expect {
          @service.onboard_user user
        }.to raise_error Agents::GitHubAgentService::Errors::IdentityMissing
      end
    end

    context 'when user has a connected GitHub identity' do
      before do
        expect(user).to receive(:identity).with('github').and_return(github_identity)
      end

      it 'should make the appropriate API client call' do
        expect(git_hub_client).to receive(:add_team_membership).with(main_team_id, github_username)
        @service.onboard_user user
      end
    end
  end

  describe 'offboard_user' do
    context 'when user does not have a connected GitHub identity' do
      before do
        expect(user).to receive(:identity).with('github').and_return(nil)
      end

      it 'should throw an IdentityMissing error' do
        expect {
          @service.offboard_user user
        }.to raise_error Agents::GitHubAgentService::Errors::IdentityMissing
      end
    end

    context 'when user has a connected GitHub identity' do
      before do
        expect(user).to receive(:identity).with('github').and_return(github_identity)
      end

      it 'should make the appropriate API client call' do
        expect(git_hub_client).to receive(:remove_organization_member).with(org, github_username)
        @service.offboard_user user
      end
    end
  end

end
