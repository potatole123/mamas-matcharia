import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import java.util.List;

public class Testing {

    @Test
    public void RegisterUser_validEmail_validUsername_validPswd_pass() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "BronnyJames!";

        Profile result = RegisterUser(email, username, pswd);

        assertEquals(username, result.displayName);
    }

    @Test
    public void RegisterUser_notValidEmail_validUsername_validPswd_fail() {
        String email = "a@b.";
        String username = "LebronJames1";
        String pswd = "BronnyJames!";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_validEmail_notValidUsername_validPswd_fail() {
        String email = "a@b.c";
        String username = "a";
        String pswd = "BronnyJames!";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void RegisterUser_validEmail_validUsername_notValidPswd_fail() {
        String email = "a@b.c";
        String username = "LebronJames1";
        String pswd = "b";

        assertThrows(IllegalArgumentException.class, () -> {
            RegisterUser(email, username, pswd);
        });
    }

    @Test
    public void LoginUser_validUsername_validPswd_pass() {
        String username = "LebronJames1";
        String pswd = "BronnyJames!";

        Profile result = LoginUser(username, pswd);

        assertEquals(username, result.displayName);
    }

    @Test
    public void LoginUser_notValidUsername_validPswd_fail() {
        String username = "l";
        String pswd = "BronnyJames!";

        assertThrows(IllegalArgumentException.class, () -> {
            LoginUser(username, pswd);
        });
    }

    @Test
    public void LoginUser_validUsername_notValidPswd_fail() {
        String username = "LebronJames1";
        String pswd = "b";

        assertThrows(IllegalArgumentException.class, () -> {
            LoginUser(username, pswd);
        });
    }

    @Test
    public void JoinMultiplayerGame_validJoinCode_pass() {
        String joinCode = "123456";

        JoinMultiplayerGame(joinCode);
    }

    @Test
    public void JoinMultiplayerGame_notValidJoinCode_fail() {
        String joinCode = "meow";

        assertThrows(IllegalArgumentException.class, () -> {
            JoinMultiplayerGame(joinCode);
        });
    }

    @Test
    public void GenerateNPCs_validSeed_validFreq_validRecipeSet_pass() {
        int seed = 42;
        double freq = 4.0;
        RecipeSet recipeSet = new RecipeSet();

        List<NPC> result = GenerateNPCs(seed, freq, recipeSet);

        assertNotNull(result);
    }

    @Test
    public void GenerateNPCs_validSeed_notValidFreq_validRecipeSet_fail() {
        int seed = 42;
        double freq = 0;
        RecipeSet recipeSet = new RecipeSet();

        assertThrows(IllegalArgumentException.class, () -> {
            GenerateNPCs(seed, freq, recipeSet);
        });
    }
}