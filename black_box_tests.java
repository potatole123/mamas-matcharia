import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import java.util.List;

public class Testing {

    @Test
    public void RegisterUser_validEmail_validUsername_validPswd_pass() {
        String email = "valid";
        String username = "valid";
        String pswd = "valid";

        Profile result = RegisterUser(email, username, pswd);

        assertEquals(username, result.displayName);
    }

    @Test
    public void RegisterUser_notValidEmail_validUsername_validPswd_fail() {
        String email = "not_valid";
        String username = "valid";
        String pswd = "valid";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_validEmail_notValidUsername_validPswd_fail() {
        String email = "valid";
        String username = "not_valid";
        String pswd = "valid";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_validEmail_validUsername_notValidPswd_fail() {
        String email = "valid";
        String username = "valid";
        String pswd = "not_valid";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void LoginUser_validUsername_validPswd_pass() {
        String username = "valid";
        String pswd = "valid";

        Profile result = LoginUser(username, pswd);

        assertEquals(username, result.displayName);
    }

    @Test
    public void LoginUser_notValidUsername_validPswd_fail() {
        String username = "not_valid";
        String pswd = "valid";

        assertThrows(IllegalArgumentException.class, () -> {
            LoginUser(username, pswd);
        });
    }

    @Test
    public void LoginUser_validUsername_notValidPswd_fail() {
        String username = "valid";
        String pswd = "not_valid";

        assertThrows(IllegalArgumentException.class, () -> {
            LoginUser(username, pswd);
        });
    }

    @Test
    public void JoinMultiplayerGame_validJoinCode_pass() {
        String joinCode = "valid";

        JoinMultiplayerGame(joinCode);
    }

    @Test
    public void JoinMultiplayerGame_notValidJoinCode_fail() {
        String joinCode = "not_valid";

        assertThrows(IllegalArgumentException.class, () -> {
            JoinMultiplayerGame(joinCode);
        });
    }

    @Test
    public void GenerateNPCs_validSeed_validFreq_validRecipeSet_pass() {
        int seed = 42;
        double freq = 42;
        RecipeSet recipeSet = new RecipeSet();

        List<NPC> result = GenerateNPCs(seed, freq, recipeSet);

        assertNotNull(result);
    }

    @Test
    public void GenerateNPCs_validSeed_notValidFreq_validRecipeSet_fail() {
        int seed = 42;
        double freq = -1;
        RecipeSet recipeSet = new RecipeSet();

        assertThrows(IllegalArgumentException.class, () -> {
            GenerateNPCs(seed, freq, recipeSet);
        });
    }
}